const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{const a=await db.asset.findUniqueOrThrow({where:{id:'3808a02b-5be2-4a20-812d-76565f866a5d'}});require('fs').writeFileSync('/app/test-output/divine-original-alignment.json',JSON.stringify(a.metadata.alignment));console.log(JSON.stringify({saved:true}));await db.$disconnect();})();
