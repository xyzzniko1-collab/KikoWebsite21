const {PrismaClient}=require("@prisma/client"); const bcrypt=require("bcryptjs");
const db=new PrismaClient();
async function main(){const u=process.env.OWNER_USERNAME||"KikoEnakTau",p=process.env.OWNER_PASSWORD;if(!p)throw new Error("OWNER_PASSWORD missing");await db.user.upsert({where:{username:u},update:{role:"OWNER",passwordHash:await bcrypt.hash(p,12),active:true},create:{username:u,passwordHash:await bcrypt.hash(p,12),role:"OWNER"}});console.log("Owner ready:",u)}
main().finally(()=>db.$disconnect());