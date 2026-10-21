const {PrismaClient}=require('@prisma/client');
const fs=require('fs');
const db=new PrismaClient();
(async()=>{try{const a=await db.asset.findUniqueOrThrow({where:{id:'46b44bfb-3681-4bec-99be-6dce45d0d5cd'}});fs.writeFileSync('/tmp/motivation-033-alignment.json',JSON.stringify({assetId:a.id,duration:a.duration,alignment:a.metadata.alignment}));console.log(JSON.stringify({saved:true,duration:a.duration,keys:Object.keys(a.metadata.alignment||{})}));}finally{await db.$disconnect();}})();
