import { Inject, Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
  ) {}
  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          console.log('URL', result?.secure_url);
          resolve(result?.secure_url as string);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadSingleFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<string> {
    console.log('Uploading file from upload service uploadSingleFile:', file);
    return this.uploadToCloudinary(file, folder);
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder = 'uploads',
  ): Promise<string[]> {
    return Promise.all(
      files.map((file) => this.uploadToCloudinary(file, folder)),
    );
  }
}
