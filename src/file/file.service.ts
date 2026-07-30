import { Injectable, Logger } from '@nestjs/common';
import { Readable, Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CloudProvidersMetaData } from './cloud.providers.metadata';
import { R_OK } from 'constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cloudProviders = new CloudProvidersMetaData();

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (file.startsWith('/')) {
      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    } else if (file.startsWith('http')) {
      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      file = this.resolveWithinRoot(file, process.cwd());

      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    }
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      throw new Error('cannot delete file from this location');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      file = this.resolveWithinRoot(file, process.cwd());
      await fs.promises.unlink(file);
      return true;
    }
  }

  /**
   * Resolves `file` relative to `root` and ensures the normalized result
   * stays within `root`, rejecting paths that escape it via traversal
   * sequences (e.g. "../"). Prevents path/directory traversal (CWE-22/23/36).
   */
  private resolveWithinRoot(file: string, root: string): string {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, file);

    if (
      resolved !== resolvedRoot &&
      !resolved.startsWith(resolvedRoot + path.sep)
    ) {
      throw new Error(`Invalid file path: ${file}`);
    }

    return resolved;
  }
}
