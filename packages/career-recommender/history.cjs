const { AREA_MAP } = require('./careers-recommender.cjs');
const { historicalSignals } = require('./student-profile.cjs');

async function loadFeedbackHistory(sb, user, options = {}) {
  const areas = (user.intereses || []).filter(area=>Object.hasOwn(AREA_MAP,area));
  if (!areas.length) return [];
  const limit = 80;
  const url = String(options.url ?? process.env.RBMT_SUPABASE_URL ?? '').replace(/\/$/,'');
  const secret = options.secret ?? process.env.RBMT_SUPABASE_SECRET_KEY;
  const request = options.fetch || global.fetch;
  const local = async () => {
    try {
      const {data,error} = await sb.from('career_recommendation_feedback')
        .select('program_code,decision,student:users!career_recommendation_feedback_user_id_fkey(id,intereses,questionnaire,career_suggestions)')
        .neq('user_id',user.id).order('updated_at',{ascending:false}).limit(200);
      if (error) throw error;
      return (data || []).filter(entry=>entry.student?.id !== user.id && entry.student?.intereses?.some(area=>areas.includes(area)))
        .map(entry=>({program_code:entry.program_code,decision:entry.decision,signals:historicalSignals(entry.student.career_suggestions?.profile_signals || entry.student.questionnaire?.signals)}));
    } catch { console.warn('recommendation history: portal history unavailable'); return []; }
  };
  const shared = async () => {
    if (!url || !secret) return [];
    try {
      const params = new URLSearchParams({
        select:'program_code,decision,matching_sessions!inner(selected_area,questionnaire)',
        'matching_sessions.selected_area':`in.(${areas.join(',')})`,order:'created_at.desc',limit:String(limit),
      });
      const response = await request(`${url}/rest/v1/recommendation_feedback?${params}`,{headers:{apikey:secret},signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error('history unavailable');
      const data = await response.json();
      return (Array.isArray(data) ? data : []).filter(entry=>areas.includes(entry.matching_sessions?.selected_area))
        .map(entry=>({program_code:entry.program_code,decision:entry.decision,signals:historicalSignals(entry.matching_sessions?.questionnaire?.signals)}));
    } catch { console.warn('recommendation history: RBMT history unavailable'); return []; }
  };
  const [portalHistory,rbmtHistory] = await Promise.all([local(),shared()]);
  return [...rbmtHistory,...portalHistory].filter(entry=>['approved','rejected'].includes(entry.decision)).slice(0,limit);
}
module.exports = { loadFeedbackHistory };
