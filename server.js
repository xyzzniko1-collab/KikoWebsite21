import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
const { Pool } = pg;
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error("DATABASE_URL and SESSION_SECRET are required.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PgSession = connectPgSimple(session);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

const loginLimiter=rateLimit({windowMs:15*60*1000,max:20,standardHeaders:true,legacyHeaders:false});
const writeLimiter=rateLimit({windowMs:60*1000,max:60,standardHeaders:true,legacyHeaders:false});

function requireAuth(req,res,next){ if(!req.session.userId) return res.status(401).json({error:"Login diperlukan"}); next(); }
async function currentUser(req){ if(!req.session.userId)return null; return prisma.user.findUnique({where:{id:req.session.userId}}); }
async function requireRole(req,res,next){
  const user=await currentUser(req);
  if(!user||user.role!=="OWNER")return res.status(403).json({error:"Owner only"});
  req.user=user;next();
}

app.get("/api/config",(req,res)=>res.json({discordUrl:process.env.DISCORD_URL||"https://discord.gg/U6sFp89fFa"}));

app.post("/api/auth/login",loginLimiter,async(req,res)=>{
  const {username,password}=req.body||{};
  if(typeof username!=="string"||typeof password!=="string")return res.status(400).json({error:"Data login tidak valid"});
  const user=await prisma.user.findUnique({where:{username}});
  if(!user||!user.active||!(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({error:"Username atau password salah"});
  req.session.userId=user.id;
  res.json({user:{username:user.username,role:user.role}});
});
app.post("/api/auth/logout",requireAuth,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/auth/me",async(req,res)=>{const u=await currentUser(req);res.json({user:u?{username:u.username,role:u.role}:null})});

app.get("/api/links",async(req,res)=>{
  const u=await currentUser(req);
  const links=await prisma.link.findMany({orderBy:{createdAt:"desc"},include:{createdBy:{select:{username:true}}}});
  const visible=links.filter(x=>x.visibility==="PUBLIC"||(u&&(x.visibility==="MEMBER"||u.role==="OWNER"&&x.visibility==="PRIVATE")));
  res.json(visible);
});

app.post("/api/links",writeLimiter,requireAuth,async(req,res)=>{
  const u=await currentUser(req);
  const {title,url,visibility,category,followGate}=req.body||{};
  if(!title||!url||!category)return res.status(400).json({error:"Field wajib belum lengkap"});
  let v=visibility;
  if(u.role==="MEMBER")v="MEMBER";
  if(u.role!=="OWNER"&&visibility==="PRIVATE")v="MEMBER";
  try{new URL(url)}catch{return res.status(400).json({error:"URL tidak valid"})}
  const link=await prisma.link.create({data:{title,url,visibility:v,category,followGate:Boolean(followGate),createdById:u.id}});
  res.json(link);
});

app.post("/api/links/:id/gate",requireAuth,async(req,res)=>{
  const u=await currentUser(req);
  const link=await prisma.link.findUnique({where:{id:req.params.id}});
  if(!link)return res.status(404).json({error:"Link tidak ditemukan"});
  if(link.followGate&&u.role!=="OWNER"){
    await prisma.downloadGate.upsert({where:{linkId_userId:{linkId:link.id,userId:u.id}},update:{},create:{linkId:link.id,userId:u.id}});
  }
  res.json({url:link.url});
});

app.post("/api/users",writeLimiter,requireRole,async(req,res)=>{
  const {username,password}=req.body||{};
  if(!username||!password||password.length<8)return res.status(400).json({error:"Username dan password minimal 8 karakter"});
  const passwordHash=await bcrypt.hash(password,12);
  try{
    const user=await prisma.user.create({data:{username,passwordHash,role:"MEMBER"}});
    res.status(201).json({id:user.id,username:user.username,role:user.role});
  }catch{res.status(409).json({error:"Username sudah digunakan"})}
});

app.get("/api/announcements",async(req,res)=>res.json(await prisma.announcement.findMany({orderBy:{createdAt:"desc"},include:{author:{select:{username:true}}}})));
app.post("/api/announcements",writeLimiter,requireRole,async(req,res)=>{
  const {title,body}=req.body||{};
  if(!title||!body)return res.status(400).json({error:"Judul dan isi wajib"});
  res.status(201).json(await prisma.announcement.create({data:{title,body,authorId:req.user.id}}));
});

app.get("/api/messages",requireAuth,async(req,res)=>res.json(await prisma.message.findMany({orderBy:{createdAt:"asc"},take:100,include:{author:{select:{username:true}}}})));
app.post("/api/messages",writeLimiter,requireAuth,async(req,res)=>{
  const body=String(req.body?.body||"").trim();
  if(!body||body.length>1000)return res.status(400).json({error:"Pesan tidak valid"});
  const u=await currentUser(req);
  res.status(201).json(await prisma.message.create({data:{body,authorId:u.id},include:{author:{select:{username:true}}}}));
});

app.get("/api/owner/summary",requireRole,async(req,res)=>res.json({
  members:await prisma.user.count({where:{role:"MEMBER"}}),
  links:await prisma.link.count(),
  announcements:await prisma.announcement.count(),
  messages:await prisma.message.count()
}));

app.use(express.static("public"));
app.get("*",(req,res)=>res.sendFile(process.cwd()+"/public/index.html"));

app.listen(port,()=>console.log(`KikoLink running on http://localhost:${port}`));