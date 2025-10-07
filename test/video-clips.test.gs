/**
 * Unit tests for the video clips manager covering clip metadata creation,
 * Drive folder orchestration, and YouTube payload validation.
 */
function runVideoClipsUnitTests() {
  const suite = createVideoSuite_('Video Clips Automation');

  addVideoTest_(suite, 'creates goal clip metadata with buffers applied', function() {
    const manager = new VideoClipsManager();

    const saved = [];
    const processingCalls = [];
    manager.saveClipMetadata = function(metadata) {
      saved.push(metadata);
      return { success: true };
    };
    manager.ensurePlayerFolder = function(player) {
      return { success: true, folder_id: 'player-folder-1', folder_path: 'Video Root/' + player };
    };
    manager.ensureMatchFolder = function(matchId) {
      return { success: true, folder_id: 'match-folder-1', folder_path: 'Match Highlights/' + matchId };
    };
    manager.requestCloudConvertProcessing = function(metadata) {
      processingCalls.push(metadata);
      return { success: true, job_id: 'make-123' };
    };
    manager.getMatchInfo = function() {
      return { date: '12/09/2024', opponent: 'Rivals FC', venue: 'Stadium', competition: 'League' };
    };

    const result = manager.createGoalClip('67', 'Alex Morgan', 'Sam Kerr', 'Rivals FC', 'match-001');

    expectVideo_(result.success, 'Goal clip creation should succeed');
    const clipMetadata = result.clip_metadata;
    expectVideo_(clipMetadata, 'Clip metadata should be returned');
    expectVideoEqual_(clipMetadata.event_type, 'goal', 'Event type should be goal');

    const buffers = getConfigValue('VIDEO.CLIP_BUFFERS.GOAL', { preSeconds: 0, postSeconds: 0 });
    const preBuffer = Number(buffers.preSeconds) || 0;
    const postBuffer = Number(buffers.postSeconds) || 0;
    const expectedStart = Math.max(0, (67 * 60) - preBuffer);
    const defaultDuration = getConfigValue('VIDEO.DEFAULT_CLIP_DURATION', 30);
    const expectedDuration = Math.max(preBuffer + postBuffer, defaultDuration);

    expectVideoEqual_(clipMetadata.start_time_seconds, expectedStart, 'Pre-buffer should be applied to start time');
    expectVideoEqual_(clipMetadata.duration_seconds, expectedDuration, 'Duration should respect configured minimum');
    expectVideo_(clipMetadata.player_folder_id === 'player-folder-1', 'Player folder id should be attached');
    expectVideo_(clipMetadata.match_folder_id === 'match-folder-1', 'Match folder id should be attached');
    expectVideoEqual_(processingCalls.length, 1, 'Processing should be requested once');
    expectVideo_(processingCalls[0] === clipMetadata, 'Processing payload should reuse clip metadata reference');

    return 'Clip ' + clipMetadata.clip_id + ' saved with duration ' + clipMetadata.duration_seconds + 's';
  });

  addVideoTest_(suite, 'ensures player folders resolve with Drive context', function() {
    const manager = new VideoClipsManager();
    const originalGetFolderById = DriveApp.getFolderById;
    const originalGetOrCreate = manager.getOrCreatePlayerFolder;
    let requestedPlayer = '';

    DriveApp.getFolderById = function(id) {
      return {
        getName: function() { return 'Video Root'; }
      };
    };

    manager.getOrCreatePlayerFolder = function(player) {
      requestedPlayer = player;
      return {
        getId: function() { return 'player-folder-42'; },
        getName: function() { return 'AlexMorgan'; }
      };
    };

    const result = manager.ensurePlayerFolder('Alex Morgan');

    DriveApp.getFolderById = originalGetFolderById;
    manager.getOrCreatePlayerFolder = originalGetOrCreate;

    expectVideo_(result.success, 'ensurePlayerFolder should succeed when Drive is configured');
    expectVideoEqual_(requestedPlayer, 'Alex Morgan', 'Player name should be forwarded to helper');
    expectVideoEqual_(result.folder_id, 'player-folder-42', 'Folder id should match helper result');
    expectVideoEqual_(result.folder_path, 'Video Root/AlexMorgan', 'Folder path should include Drive root and player folder');

    return 'Folder path resolved as ' + result.folder_path;
  });

  addVideoTest_(suite, 'builds YouTube payload from stored metadata', function() {
    const manager = new VideoClipsManager();
    let capturedParams = null;
    let updatedClip = null;

    manager.getClipMetadata = function() {
      return {
        title: 'Alex Morgan Goal vs Rivals',
        description: 'Match winner',
        tags: ['Our Club', 'Goal']
      };
    };
    manager.executeYouTubeUpload = function(filePath, params) {
      capturedParams = params;
      return { success: true, youtube_url: 'https://youtu.be/demo', video_id: 'demo123' };
    };
    manager.updateClipWithYouTubeInfo = function(clipId, url, videoId) {
      updatedClip = { clipId: clipId, url: url, videoId: videoId };
    };

    const result = manager.uploadToYouTube('clip-123', '/tmp/video.mp4');

    expectVideo_(result.success, 'YouTube upload should report success');
    expectVideo_(capturedParams !== null, 'Upload parameters should be captured');
    expectVideoEqual_(capturedParams.title, 'Alex Morgan Goal vs Rivals', 'Title should match clip metadata');
    expectVideoEqual_(capturedParams.privacy, 'unlisted', 'Privacy should respect configuration');
    expectVideo_(Array.isArray(capturedParams.tags) && capturedParams.tags.length === 2, 'Tags should be forwarded');
    expectVideo_(updatedClip && updatedClip.clipId === 'clip-123', 'Clip metadata should be updated with YouTube info');

    return 'YouTube payload ready with title "' + capturedParams.title + '"';
  });

  return finalizeVideoSuite_(suite);
}

function createVideoSuite_(name) {
  return {
    name: name,
    tests: [],
    passed: 0,
    failed: 0
  };
}

function addVideoTest_(suite, name, fn) {
  try {
    var details = fn();
    suite.tests.push({ name: name, status: 'PASS', details: details || '' });
    suite.passed += 1;
  } catch (error) {
    suite.tests.push({
      name: name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error)
    });
    suite.failed += 1;
  }
}

function expectVideo_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Expected condition to be truthy');
  }
}

function expectVideoEqual_(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'Values should be equal') + ' (expected ' + expected + ', got ' + actual + ')');
  }
}

function finalizeVideoSuite_(suite) {
  suite.total = suite.passed + suite.failed;
  suite.status = suite.failed === 0 ? 'PASS' : 'FAIL';
  return suite;
}
