function createMeetingRepository(sb) {
  async function checked(query) {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  return {
    async enqueue(row) {
      if (row.source === 'drive') {
        const previous = await checked(sb.from('processed_meet_docs').select('user_id').eq('file_id', row.external_id.slice(6)).maybeSingle());
        if (previous?.user_id) return null;
      }
      const inserted = await checked(sb.from('meeting_transcripts').upsert(row, { onConflict: 'external_id', ignoreDuplicates: true }).select('*').maybeSingle());
      if (!inserted && row.meeting_at_source === 'conference') {
        await checked(sb.from('meeting_transcripts').update({ meeting_at:row.meeting_at, meeting_at_source:'conference' })
          .eq('external_id',row.external_id).in('status',['queued','failed','unmatched']));
      }
      return inserted;
    },
    async claim(limit) { return await checked(sb.rpc('claim_meeting_transcripts', { p_limit: limit })) || []; },
    async candidates() {
      return await checked(sb.from('users').select('id, nombre, apellidos, lead_id, role, assigned_to').not('assigned_to','is',null)) || [];
    },
    async saveRaw(item, text) {
      const row = await checked(sb.from('meeting_transcripts').update({ raw_text: text, updated_at: new Date().toISOString() })
        .eq('id',item.id).eq('status','processing').eq('lease_token',item.lease_token).select('id').maybeSingle());
      if (!row) throw new Error('meeting_lease_lost');
    },
    async complete(item, result) {
      return checked(sb.rpc('complete_meeting_transcript', { p_id: item.id, p_lease_token: item.lease_token,
        p_user_id: result.userId, p_booking_id: result.bookingId, p_summary: result.summary, p_raw_text: result.text,
        p_title: result.title, p_meeting_at: result.meetingAt }));
    },
    async fail(item, code, status) {
      await checked(sb.from('meeting_transcripts').update({ status, error_code: code, lease_until: null,
        retry_at: new Date(Date.now() + 15 * 60000).toISOString(), updated_at: new Date().toISOString() })
        .eq('id',item.id).eq('status','processing').eq('lease_token',item.lease_token));
    },
  };
}
module.exports = { createMeetingRepository };
