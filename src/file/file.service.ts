import { Injectable, Logger } from '@nestjs/common';
import { Readable, Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CloudProvidersMetaData } from './cloud.providers.metadata';
import { R_OK } from 'constants';

const FILE_ROOT = path.resolve(process.cwd());

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cloudProviders = new CloudProvidersMetaData();

  private isWithinRoot(resolvedPath: string): boolean {
    return (
      resolvedPath === FILE_ROOT || resolvedPath.startsWith(FILE_ROOT + path.sep)
    );
  }

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (file.startsWith('/')) {
      const resolved = path.resolve(file);

      if (!this.isWithinRoot(resolved)) {
        throw new Error(`no such file or directory, access '${file}'`);
      }

      await fs.promises.access(resolved, R_OK);

      return fs.createReadStream(resolved);
    } else if (file.startsWith('http')) {
      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      const resolved = path.resolve(process.cwd(), file);

      if (!this.isWithinRoot(resolved)) {
        throw new Error(`no such file or directory, access '${file}'`);
      }

      await fs.promises.access(resolved, R_OK);

      return fs.createReadStream(resolved);
    }
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      throw new Error('cannot delete file from this location');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      const resolved = path.resolve(process.cwd(), file);

      if (!this.isWithinRoot(resolved)) {
        throw new Error('cannot delete file from this location');
      }

      await fs.promises.unlink(resolved);
      return true;
    }
  }
}
