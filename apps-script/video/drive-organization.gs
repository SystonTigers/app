/**
 * @fileoverview Manages Google Drive folder structures for video assets.
 */

var Video = Video || {};

Video.DriveOrganization = class {
  constructor(options = {}) {
    this.driveApp = options.driveApp || DriveApp;
    this.logger = options.logger || (options.loggerFactory ? options.loggerFactory('VideoDrive') : logger.scope('VideoDrive'));
  }

  ensurePlayerFolder(player) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) {
        return { success: false, error: 'Main video folder not configured' };
      }

      const mainFolder = this.driveApp.getFolderById(mainFolderId);
      const playerFolder = this.getOrCreatePlayerFolder(player);

      return {
        success: !!playerFolder,
        folder_id: playerFolder ? playerFolder.getId() : null,
        player: player,
        folder_name: playerFolder ? playerFolder.getName() : null,
        folder_path: playerFolder ? `${mainFolder.getName()}/${playerFolder.getName()}` : ''
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  getOrCreatePlayerFolder(player) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) {
        return null;
      }

      const mainFolder = this.driveApp.getFolderById(mainFolderId);
      const safeFolderName = StringUtils.toSafeFilename(player);
      const existingFolders = mainFolder.getFoldersByName(safeFolderName);

      if (existingFolders.hasNext()) {
        return existingFolders.next();
      }

      return mainFolder.createFolder(safeFolderName);
    } catch (error) {
      this.logger.error('Failed to get/create player folder', {
        error: error.toString(),
        player
      });
      return null;
    }
  }

  ensureMatchFolder(matchId, matchInfo = {}) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) {
        return { success: false, error: 'Main video folder not configured' };
      }

      const mainFolder = this.driveApp.getFolderById(mainFolderId);
      const prefix = getConfigValue('VIDEO.MATCH_FOLDER_PREFIX', 'Match Highlights');
      const matchRoot = this.getOrCreateChildFolder(mainFolder, prefix);

      if (!matchRoot) {
        return { success: false, error: 'Unable to create match highlights root folder' };
      }

      const safeDate = (matchInfo.date || DateUtils.formatUK(DateUtils.now())).replace(/\//g, '-');
      const safeOpponent = matchInfo.opponent ? StringUtils.toSafeFilename(matchInfo.opponent) : 'opposition';
      const matchFolderName = `${safeDate}_${safeOpponent}`;

      const matchFolder = this.getOrCreateChildFolder(matchRoot, matchFolderName);

      return {
        success: !!matchFolder,
        folder_id: matchFolder ? matchFolder.getId() : null,
        folder_path: `${prefix}/${matchFolderName}`,
        match_id: matchId
      };
    } catch (error) {
      this.logger.error('Failed to ensure match folder', {
        error: error.toString(),
        matchId
      });

      return { success: false, error: error.toString(), match_id: matchId };
    }
  }

  getOrCreateChildFolder(parentFolder, folderName) {
    if (!parentFolder || !folderName) {
      return null;
    }

    const existing = parentFolder.getFoldersByName(folderName);
    if (existing.hasNext()) {
      return existing.next();
    }

    return parentFolder.createFolder(folderName);
  }
};
