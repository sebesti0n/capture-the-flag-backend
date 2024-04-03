const knex = require("knex")(
    require("../Configuration/knexfile")["development"]
  );
exports.startEvent = async (req, res) => {
    try {
        const regId = req.query.rid;
    const eid = req.query.eid;
    const team = await knex("teams")
      .where("player1_eid", regId)
      .orWhere("player2_eid", regId)
      .orWhere("player3_eid", regId)
      .returning("team_id");
      console.log('teamId',team);
      if(team.length===0){
        return res.json({success:true, message: "Team not Registered",sequence:null, nextRiddleIndex:null});
      }
    const tid = team[0].team_id;
    console.log("tid",tid);

    await knex("user_event_participation")
      .whereNull("start_time")
      .orWhere("start_time", "=", 0)
      .andWhere("event_id", "=", eid)
      .andWhere("team_id", "=", tid)
      .update({
        start_time: Date.now(),
        end_time: Date.now(),
      });

    const data = await knex("user_event_participation")
      .where("event_id", "=", eid)
      .andWhere("team_id", "=", tid)
      .returning("sequence","Number_correct_answer");
      let next = 0;
      let seq;
      let qList = [];
      console.log("daat",data);
      if (data.length !== 0) {
        seq = [...data[0].sequence];
        next = data[0].Number_correct_answer;
      } else {
        return res.json({success:true, message: "Team not Registered1",sequence:null, nextRiddleIndex:null});
        seq = [];
      }
      for (let i = 0; i < seq.length; i++) {
        const level = await knex("questions")
          .where("event_id", "=", eid)
          .andWhere("level", "=", i + 1)
          .orderBy(["level", "question_id"])
          .returning(
            "question_id"
          );
  
        qList.push(level[seq[i]].question_id);
      }
      const isRiddleavailable = await knex("answers_history")
      .where("question_id", "=", qList[0])
      .andWhere("event_id", "=", eid)
      .andWhere("teamId", "=", tid)
      .count("*");

    const count = isRiddleavailable[0].count;
    if (count == 0) {
      await knex("answers_history").insert({
        question_id: qList[0],
        event_id: eid,
        teamId: tid,
        startTime: Date.now(),
      });
    }
      
      return res.json({success:true, message:"Sequence of Riddle", sequence:qList, nextRiddleIndex:next});
    } catch(err){
        console.log(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error", sequence:null, nextRiddleIndex:null});
    }
}
exports.riddleStoryLine = async (req, res) => {
    try {
        const riddleId = req.query.riddleId;
        const riddleType = req.query.type;
        const regId = req.query.regId;
        const eventId = req.query.eid;
        let riddle;
        await knex.transaction( async(trx)=>{
            riddle = await trx("questions")
                .where('question_id',riddleId)
                .select('question','storyline','imageLink','riddleImageLink');
        });
        if(riddleType==1){
        const team = await knex("teams")
          .where("player1_eid", regId)
          .orWhere("player2_eid", regId)
          .orWhere("player3_eid", regId)
          .returning("team_id");
          if(team.length===0){
            return res.json({success:true, message: "Team not Registered"});
          }
        const tid = team[0].team_id;

            const data = await knex('answers_history')
                                .where({
                                    "question_id":riddleId,
                                    "teamId":tid,
                                    "event_id":eventId,
                                }).count('*');
            if(data[0].count==0){
                await knex('answers_history')
                                .insert({
                                    "question_id":riddleId,
                                    "teamId":tid,
                                    "event_id":eventId,
                                    "startTime":Date.now()
                                })
            }
                        
            return res.status(200).json({
                success:true,
                message:"Riddle",
                riddle:riddle[0].question,
                imageLink:riddle[0].imageLink
            });
        }
        else{
            return res.status(200).json({
                success:true,
                message:"Storyline",
                riddle:riddle[0].storyline,
                imageLink:riddle[0].riddleImageLink
            });
        }
    }catch(err){
        console.log(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error"});
    }
    };

    exports.onSubmit = async (req, res) => {
        try {
          let { eid, regId, currRid, nextRid, type, answer } = req.body;
          const team = await knex("teams")
          .where("player1_eid", regId)
          .orWhere("player2_eid", regId)
          .orWhere("player3_eid", regId)
          .returning("team_id");
          if(team.length===0){
            return res.json({success:true, message: "Team not Registered"});
          }
        const tid = team[0].team_id;
          console.log({
            eid,
            tid,
            currRid,
            nextRid,
            type,
            answer
          });

          const currentTime = Date.now();
          if(type==1){
            const correct = await knex("questions")
              .where({
                question_id: currRid,
                answer: answer,
              }).count('*');
              console.log(correct[0].count);
              if(correct[0].count==0) return res
              .status(200)
              .json({ success: true, message: "Wrong Answer"});
              else return res
              .status(200)
              .json({ success: true, message: "correct Answer"});
          }
      
          await knex.transaction(async (trx) => {
            const pointsArray = await trx("questions")
              .where({
                question_id: currRid,
                unique_code: answer,
              })
              .select("*");
            console.log("pointsArray", pointsArray);
            if (pointsArray.length === 0) {
              return res
                .status(200)
                .json({ success: true, message: "Wrong Answer", next: -1 });
            }
            const point = pointsArray[0].point;
            const currentRiddleStartMs = await trx("answers_history")
              .where({
                endTime: 0,
                teamId: tid,
                event_id: eid,
                question_id: currRid,
              })
              .update({ endTime: currentTime })
              .returning("startTime");
            console.log("currentRiddleStartMs", currentRiddleStartMs);
            const nextidx = await trx("user_event_participation")
              .where({
                team_id: tid,
                event_id: eid,
              })
              .returning("Number_correct_answer");
            if(currentRiddleStartMs.length==0)return res.status(200).json({
                success:true,
                message:"Submit successfully",
                next: nextidx[0].Number_correct_answer,
            })
      
            const earnedPoint = Math.max(
              250,
              Math.floor(
                point -
                  ((Date.now() - currentRiddleStartMs[0].startTime) / 600000) * 10
              )
            );
            if (nextRid != -1) {
              await trx("answers_history").insert({
                question_id: nextRid,
                event_id: eid,
                teamId: tid,
                startTime: currentTime,
              });
            }
      
            const nextIndex = await trx("user_event_participation")
              .where({
                team_id: tid,
                event_id: eid,
              })
              .increment("Number_correct_answer")
              .update({ end_time: currentTime })
              .returning("Number_correct_answer");
      
            console.log("nextIndex", nextIndex);
      
            await trx("pointsTable")
              .insert({
                eventId: eid,
                teamId: tid,
                TotalPoints: earnedPoint,
              })
              .onConflict(["eventId", "teamId"])
              .merge({
                TotalPoints: knex.raw("?? + ?", [
                  "pointsTable.TotalPoints",
                  earnedPoint,
                ]),
              });
      
            return res.status(200).json({
              success: true,
              message: "Correct Answer",
              next: nextIndex[0].Number_correct_answer,
            });
          });
        } catch (error) {
          console.log(error);
          return res
            .status(500)
            .json({ success: false, message: "Unknown Error", next: null });
        }
      };

      exports.getHint = async (req,res)=>{
        const eid=req.query.eid;
        const enroll = req.query.enroll;
        const type = req.query.type;
        const riddleId = req.query.riddle;

        try {
          const team = await knex("teams")
          .where("player1_eid", enroll)
          .orWhere("player2_eid", enroll)
          .orWhere("player3_eid", enroll)
          .returning("team_id");
          if(team.length===0){
            return res.json({success:true, message: "Team not Registered"});
          }
        const tid = team[0].team_id;
          
          const hints = await knex('questions')
                            .where('question_id',riddleId)
                            .returning('Hint1','Hint2','Hint3');
          if(hints.length===0){
            return res.status(200).json({success:true,message:"No Hints Available"});
          }
          const hint1=hints[0].Hint1;
          const hint2=hints[0].Hint2;
          const hint3=hints[0].Hint3;
          const data = await knex('answers_history')
                      .where('event_id',eid)
                      .andWhere('teamId',tid)
                      .andWhere('question_id',riddleId)
                      .returning('startTime','hint1','hint2','hint3');
          console.log(data);
          const timeSpan = Number(Date.now())-Number(data[0].startTime);
          if(type==1){
            if(timeSpan>=1800000){
              if(data[0].hint1==0){
                await knex("pointsTable")
              .insert({
                eventId: eid,
                teamId: tid,
                TotalPoints: -50,
              })
              .onConflict(["eventId", "teamId"])
              .merge({
                TotalPoints: knex.raw("?? + ?", [
                  "pointsTable.TotalPoints",
                  -50,
                ]),
              });
              }
              res.status(200).json({success:true,message:hint1});
            }
            else{
              let remTime=5400000-Number(timeSpan);
              remTime=Math.floor(remTime/1000);
              const min=Math.floor((remTime%3600)/60);
              res.status(200).json({success:true,message:"Unlocked in "+String(min)+"min."});            }
          }
          if(type==2){
            if(timeSpan>=3600000){
              if(data[0].hint2==0){
                await knex("pointsTable")
              .insert({
                eventId: eid,
                teamId: tid,
                TotalPoints: -50,
              })
              .onConflict(["eventId", "teamId"])
              .merge({
                TotalPoints: knex.raw("?? + ?", [
                  "pointsTable.TotalPoints",
                  -50,
                ]),
              });
              }
              res.status(200).json({success:true,message:hint2});
            }
            else{
              let remTime=3600000-Number(timeSpan);
              remTime=Math.floor(remTime/1000);
              const min=Math.floor((remTime%3600)/60);
              res.status(200).json({success:true,message:"Unlocked in "+String(min)+"min."});            }
          }if(type==3){
            if(timeSpan>=5400000){
              if(data[0].hint3==0){
                await knex("pointsTable")
              .insert({
                eventId: eid,
                teamId: tid,
                TotalPoints: -50,
              })
              .onConflict(["eventId", "teamId"])
              .merge({
                TotalPoints: knex.raw("?? + ?", [
                  "pointsTable.TotalPoints",
                  -50,
                ]),
              });
              }
              res.status(200).json({success:true,message:hint3});
            }
            else{
              let remTime=5400000-Number(timeSpan);
              remTime=Math.floor(remTime/1000);
              const hr=Math.floor(remTime/3600);
              const min=Math.floor((remTime%3600)/60);
              res.status(200).json({success:true,message:"Unlocked in "+String(hr)+"hr "+String(min)+"min."});
            }
          }
          
        } catch (error) {
          console.log(error);
          return res
            .status(500)
            .json({ success: false, message: "Internal Server Error!"});
          
        }

      };
      