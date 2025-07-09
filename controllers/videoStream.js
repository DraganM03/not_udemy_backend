import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database.js';
import { createError } from '../utils/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const streamVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const [lessonResult] = await pool.query(
      'SELECT video_path FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (lessonResult.length === 0 || !lessonResult[0].video_path) {
      return next(createError(404, 'Video not found for this lesson.'));
    }

    const videoPath = lessonResult[0].video_path;
    // Construct the absolute path to the video file
    const absoluteVideoPath = path.join(__dirname, '..', 'static', videoPath);

    if (!fs.existsSync(absoluteVideoPath)) {
      return next(createError(404, 'Video file does not exist on the server.'));
    }

    const videoStat = fs.statSync(absoluteVideoPath);
    const fileSize = videoStat.size;

    // Process the HTTP Range header
    const range = req.headers.range;

    if (range) {
      // If there is a range header, the browser is asking for a chunk of the video.
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res
          .status(416)
          .send(
            'Requested range not satisfiable\n' + start + ' >= ' + fileSize
          );
        return;
      }

      const chunksize = end - start + 1;

      // Create a read stream for the requested chunk
      const file = fs.createReadStream(absoluteVideoPath, { start, end });

      // Set the necessary headers for a partial content response
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head); // 206 Partial Content
      file.pipe(res); // Pipe the chunk to the response
    } else {
      // If there is no range header, the browser wants the whole file from the start.
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head); // 200 OK
      fs.createReadStream(absoluteVideoPath).pipe(res); // Pipe the entire file
    }
  } catch (err) {
    next(err);
  }
};
