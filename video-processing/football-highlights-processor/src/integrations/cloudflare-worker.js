export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case '/process':
          return await handleProcessRequest(request, env);
        case '/status':
          return await handleStatusRequest(request, env);
        case '/webhook':
          return await handleWebhook(request, env);
        default:
          return new Response('Not Found', {
            status: 404,
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

async function handleProcessRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const data = await request.json();

  const requiredFields = ['clubName', 'opponent', 'matchDate'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return new Response(JSON.stringify({
        success: false,
        error: `Missing required field: ${field}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (!data.videoUrl && !data.videoFile) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Either videoUrl or videoFile must be provided'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const jobData = {
    id: generateJobId(),
    clubName: data.clubName,
    opponent: data.opponent,
    matchDate: data.matchDate,
    matchNotes: data.matchNotes || '',
    manualCuts: JSON.parse(data.manualCuts || '[]'),
    createPlayerHighlights: data.createPlayerHighlights === 'true',
    videoUrl: data.videoUrl,
    notificationUrl: data.notificationUrl,
    priority: data.createPlayerHighlights ? 5 : 10,
    status: 'queued',
    createdAt: new Date().toISOString(),
    estimatedTime: '5-15 minutes'
  };

  await env.JOBS_KV.put(`job:${jobData.id}`, JSON.stringify(jobData));

  const processingEngineUrl = env.PROCESSING_ENGINE_URL || 'https://football-processor.railway.app';

  try {
    const response = await fetch(`${processingEngineUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.API_SECRET}`
      },
      body: JSON.stringify({
        ...jobData,
        notificationUrl: `${new URL(request.url).origin}/webhook`
      })
    });

    if (!response.ok) {
      throw new Error(`Processing engine error: ${response.statusText}`);
    }

    const result = await response.json();

    await env.JOBS_KV.put(`job:${jobData.id}`, JSON.stringify({
      ...jobData,
      status: 'processing',
      engineJobId: result.jobId,
      updatedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Failed to submit to processing engine:', error);

    await env.JOBS_KV.put(`job:${jobData.id}`, JSON.stringify({
      ...jobData,
      status: 'failed',
      error: error.message,
      updatedAt: new Date().toISOString()
    }));
  }

  return new Response(JSON.stringify({
    success: true,
    jobId: jobData.id,
    message: 'Processing job created successfully',
    estimatedTime: jobData.estimatedTime,
    statusUrl: `/status?jobId=${jobData.id}`
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleStatusRequest(request, env) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'jobId parameter is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const jobData = await env.JOBS_KV.get(`job:${jobId}`);

  if (!jobData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Job not found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const job = JSON.parse(jobData);

  if (job.engineJobId && job.status === 'processing') {
    try {
      const processingEngineUrl = env.PROCESSING_ENGINE_URL || 'https://football-processor.railway.app';
      const response = await fetch(`${processingEngineUrl}/status/${job.engineJobId}`, {
        headers: {
          'Authorization': `Bearer ${env.API_SECRET}`
        }
      });

      if (response.ok) {
        const engineStatus = await response.json();

        const updatedJob = {
          ...job,
          progress: engineStatus.progress || 0,
          engineStatus: engineStatus.status,
          updatedAt: new Date().toISOString()
        };

        if (engineStatus.status === 'completed' || engineStatus.status === 'failed') {
          updatedJob.status = engineStatus.status;
          updatedJob.result = engineStatus.result;
          updatedJob.completedAt = new Date().toISOString();
        }

        await env.JOBS_KV.put(`job:${jobId}`, JSON.stringify(updatedJob));
        job = updatedJob;
      }
    } catch (error) {
      console.error('Failed to get engine status:', error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress || 0,
      clubName: job.clubName,
      opponent: job.opponent,
      matchDate: job.matchDate,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      estimatedTime: job.estimatedTime,
      result: job.result,
      error: job.error
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const data = await request.json();
  const { jobId: engineJobId, status, result, error } = data;

  if (!engineJobId) {
    return new Response('Missing jobId', { status: 400 });
  }

  const jobsList = await env.JOBS_KV.list({ prefix: 'job:' });
  let targetJobKey = null;

  for (const key of jobsList.keys) {
    const jobData = await env.JOBS_KV.get(key.name);
    const job = JSON.parse(jobData);

    if (job.engineJobId === engineJobId) {
      targetJobKey = key.name;
      break;
    }
  }

  if (!targetJobKey) {
    console.log(`Job with engine ID ${engineJobId} not found`);
    return new Response('Job not found', { status: 404 });
  }

  const jobData = await env.JOBS_KV.get(targetJobKey);
  const job = JSON.parse(jobData);

  const updatedJob = {
    ...job,
    status,
    result,
    error,
    updatedAt: new Date().toISOString()
  };

  if (status === 'completed' || status === 'failed') {
    updatedJob.completedAt = new Date().toISOString();
  }

  await env.JOBS_KV.put(targetJobKey, JSON.stringify(updatedJob));

  if (job.notificationUrl && (status === 'completed' || status === 'failed')) {
    try {
      await fetch(job.notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          status,
          result,
          error,
          clubName: job.clubName,
          opponent: job.opponent,
          matchDate: job.matchDate
        })
      });
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
    }
  }

  return new Response('OK');
}

function generateJobId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}