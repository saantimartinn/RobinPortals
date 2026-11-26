const {checked}=require('../admin-collaboration/access.cjs');
const {tutorialSteps}=require('./steps.cjs');
function fail(error,statusCode=400){throw Object.assign(new Error(error),{statusCode});}
async function tutorialState(db,actor,input,write=false){
  if(!['admin','portal','robinjr','community'].includes(input.portal))fail('invalid_portal');
  const steps=tutorialSteps(input.portal,actor);
  const progress=await checked(db.from('admin_tutorials').select('*').eq('admin_id',actor.id).eq('portal',input.portal).maybeSingle());
  if(!progress||progress.completed_revision>=progress.revision)return {required:false};
  // A permission reduction may shorten the catalogue while a tour is paused.
  // Persist the clamped cursor so the resumed browser and server agree.
  if(progress.step>=steps.length){
    const changed=await checked(db.from('admin_tutorials').update({step:steps.length-1}).eq('admin_id',actor.id).eq('portal',input.portal).eq('revision',progress.revision).eq('step',progress.step).select('step').maybeSingle());
    if(!changed)fail('tutorial_changed',409);
    progress.step=steps.length-1;
  }
  if(write){
    if(input.revision!==progress.revision||input.step!==progress.step)fail('tutorial_changed',409);
    if(input.direction!==undefined&&!['back','next'].includes(input.direction))fail('invalid_direction');
    const next=input.direction==='back'?Math.max(0,progress.step-1):Math.min(steps.length-1,progress.step+1);
    if(input.complete&&progress.step!==steps.length-1)fail('tutorial_incomplete',409);
    const patch={step:next,updated_at:new Date().toISOString(),...(input.complete?{completed_revision:progress.revision}:{})};
    const changed=await checked(db.from('admin_tutorials').update(patch).eq('admin_id',actor.id).eq('portal',input.portal).eq('revision',progress.revision).eq('step',progress.step).select('admin_id').maybeSingle());
    if(!changed)fail('tutorial_changed',409);
    return {required:!input.complete,revision:progress.revision,step:next,steps};
  }
  return {required:true,revision:progress.revision,step:Math.min(progress.step,steps.length-1),steps};
}
module.exports={tutorialState};
