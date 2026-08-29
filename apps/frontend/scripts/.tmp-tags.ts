import {PrismaPg} from "@prisma/adapter-pg"; import {PrismaClient} from "@woyab/database/client"; import {Pool} from "pg";
const pool=new Pool({connectionString:process.env.DATABASE_URL}); const prisma=new PrismaClient({adapter:new PrismaPg(pool)} as any);
async function main(){
 const tags=await prisma.tag.findMany({orderBy:{id:"asc"},select:{id:true,nameEn:true,nameFa:true,slug:true}}); console.log(JSON.stringify(tags,null,2));
 const b=await prisma.business.findUnique({where:{id:"cmte8h2v30000wghkoq89e8bo"},select:{tags:{select:{tag:true}},attributes:{select:{attribute:{select:{key:true,labelEn:true,labelFa:true}},value:true}}}}); console.log(JSON.stringify(b,null,2));
}
main().finally(async()=>{await prisma.$disconnect();await pool.end()});
