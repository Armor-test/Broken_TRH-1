import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Logger,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { W_OK } from 'constants';
import * as fs from 'fs';
import * as path from 'path';
import { Stream } from 'stream';
import { FileService } from './file.service';
import { FastifyReply } from 'fastify';
import {
  SWAGGER_DESC_DELETE_FILE,
  SWAGGER_DESC_READ_FILE,
  SWAGGER_DESC_READ_FILE_ON_SERVER,
  SWAGGER_DESC_SAVE_RAW_CONTENT,
} from './file.controller.swagger.desc';

@Controller('/api/file')
@ApiTags('Files controller')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private fileService: FileService) {}

  @Get()
  @ApiOkResponse({
    description: 'File read successfully',
  })
  @ApiInternalServerErrorResponse({
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        location: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    description: SWAGGER_DESC_READ_FILE,
  })
  async loadFile(
    @Query('path') path: string,
    @Query('type') contentType: string,
    @Res({ passthrough: true }) res: FastifyReply,
    @Headers('accept') acceptHeader: string,
  ) {
    let type: string;

    if (contentType) {
      type = contentType;
    } else if (acceptHeader) {
      type = acceptHeader;
    } else {
      type = 'application/octet-stream';
    }

    const file: Stream = await this.fileService.getFile(path);
    res.type(type);

    return file;
  }

  @Delete()
  @ApiOperation({
    description: SWAGGER_DESC_DELETE_FILE,
  })
  @ApiInternalServerErrorResponse({
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        location: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description: 'File deleted successfully',
  })
  async deleteFile(@Query('path') path: string): Promise<void> {
    await this.fileService.deleteFile(path);
  }

  @Put('raw')
  @ApiOperation({
    description: SWAGGER_DESC_SAVE_RAW_CONTENT,
  })
  @ApiOkResponse()
  async uploadFile(
    @Query('path') file: string,
    @Body() raw: string,
  ): Promise<void> {
    try {
      if (typeof raw === 'string' || Buffer.isBuffer(raw)) {
        if (typeof file !== 'string' || file.startsWith('http')) {
          throw new Error('invalid file path');
        }

        const baseDir = process.cwd();
        const resolved = path.resolve(baseDir, file);

        if (
          resolved !== baseDir &&
          !resolved.startsWith(baseDir + path.sep)
        ) {
          throw new Error('cannot write file to this location');
        }

        await fs.promises.access(path.dirname(resolved), W_OK);
        await fs.promises.writeFile(resolved, raw);
      }
    } catch (err) {
      this.logger.error(err.message);
    }
  }

  @Get('raw')
  @ApiOperation({
    description: SWAGGER_DESC_READ_FILE_ON_SERVER,
  })
  @ApiNotFoundResponse({
    description: 'File not Found',
  })
  @ApiOkResponse({
    description: 'Returns requested file',
  })
  async readFile(
    @Query('path') file: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    try {
      const stream = await this.fileService.getFile(file);
      res.type('application/octet-stream');

      return stream;
    } catch (err) {
      this.logger.error(err.message);
      res.status(HttpStatus.NOT_FOUND);
    }
  }
}
