const express = require('express');
const router = express.Router();
const knex = require('knex')(
    require('../Configuration/knexfile')['development']
  );

router.get('/',async (req,res)=>{
    try {
        const data =await knex('backupWebsite')
                        .returning('*');
        if(data.length==0)
        return res.status(200).json({success:true,message:"https://quiet-cheesecake-77f59f.netlify.app/"});
    else{
        return res.status(200).json({success:false,message:data[0].link})
    }

    } catch (error) {
        return res.status(200).json({success:false,message:"https://quiet-cheesecake-77f59f.netlify.app/"})
    }
});

router.post('/',async (req,res)=>{
    try {
        const url=req.body.url;
        await knex('backupWebsite').truncate();
        await knex('backupWebsite').insert({'link':url});
        const data =await knex('backupWebsite')
                        .returning('*');

        if(data.length==0)
        return res.status(200).json({success:true,message:"https://quiet-cheesecake-77f59f.netlify.app/",status:"Fail"});
    else{
        return res.status(200).json({success:true,message:data[0].link,status:"Inserted"})
    }

    } catch (error) {
        console.log(error);
        return res.status(500).json({success:true,message:"Error"});
    }
});
module.exports = router;