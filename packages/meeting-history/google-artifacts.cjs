function createMeetArtifacts({ getAccessToken, fetch: request = (...args) => fetch(...args) }) {
  async function google(advisor, url, options = {}) {
    const token = await getAccessToken(advisor);
    const response = await request(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers }, signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = response.status === 403 ? 'meet_transcription_permission_denied' : `google_artifact_${response.status}`;
      throw new Error(code);
    }
    return data;
  }
  async function driveListTranscriptDocs(advisor, since) {
    // Drive's `name contains` only matches prefixes. Meet appends Transcript to
    // the meeting title, so filter names locally after listing recent owned docs.
    const q = ["mimeType='application/vnd.google-apps.document'", 'trashed=false', "'me' in owners"];
    if (since) q.push(`createdTime > '${new Date(since).toISOString()}'`);
    const files = [];
    let pageToken;
    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      Object.entries({ q:q.join(' and '), corpora:'user', spaces:'drive', orderBy:'createdTime asc', pageSize:'100',
        fields:'nextPageToken,files(id,name,createdTime,mimeType,owners(emailAddress))', supportsAllDrives:'true', includeItemsFromAllDrives:'true' }).forEach(([key,value]) => url.searchParams.set(key,value));
      if (pageToken) url.searchParams.set('pageToken',pageToken);
      const data = await google(advisor,url);
      files.push(...(data.files || []).filter(file => /transcrip/i.test(String(file.name || '').normalize('NFKD'))));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return files;
  }
  async function enableAutomaticTranscription(advisor, meetCode) {
    if (!/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(meetCode || '')) throw new Error('invalid_meeting_code');
    const space = await google(advisor, `https://meet.googleapis.com/v2/spaces/${encodeURIComponent(meetCode)}`);
    if (!/^spaces\/[A-Za-z0-9_-]+$/.test(space.name || '')) throw new Error('invalid_meeting_space');
    const mask = 'config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration';
    const data = await google(advisor, `https://meet.googleapis.com/v2/${space.name}?updateMask=${mask}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({config:{artifactConfig:{transcriptionConfig:{autoTranscriptionGeneration:'ON'}}}}),
    });
    if (data.config?.artifactConfig?.transcriptionConfig?.autoTranscriptionGeneration !== 'ON') throw new Error('transcription_not_enabled');
    return { enabled:true };
  }
  async function transcriptionCapabilities(advisor) {
    const token = await getAccessToken(advisor);
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('access_token',token);
    const response = await request(url,{signal:AbortSignal.timeout(10000)});
    const info = await response.json();
    if (!response.ok) throw new Error('google_token_info_failed');
    const scopes = new Set(String(info.scope || '').split(' '));
    const about = await google(advisor,'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
    return { account_matches: about.user?.emailAddress?.toLowerCase() === advisor.toLowerCase(),
      auto_transcription_permission: scopes.has('https://www.googleapis.com/auth/meetings.space.settings'),
      meet_read_permission: scopes.has('https://www.googleapis.com/auth/meetings.space.readonly'),
      drive_read_permission: scopes.has('https://www.googleapis.com/auth/drive.readonly') };
  }
  return { driveListTranscriptDocs, enableAutomaticTranscription, transcriptionCapabilities,
    getTranscript:(advisor,name) => {
      if (!/^conferenceRecords\/[^/]+\/transcripts\/[^/]+$/.test(name || '')) throw new Error('invalid_transcript_name');
      return google(advisor,`https://meet.googleapis.com/v2/${name}`);
    },
    driveGetTranscriptDoc:(advisor,id) => google(advisor,`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,createdTime`),
  };
}
module.exports = { createMeetArtifacts };
