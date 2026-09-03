import { asClass, type AwilixContainer } from "awilix";
import { FileRepository } from "./file.repository";
import { FileService } from "./file.service";

export class FileContainer {
  static register(container: AwilixContainer): void {
    container.register({
      fileRepository: asClass(FileRepository).singleton(),
      fileService: asClass(FileService).singleton(),
    });
  }
}
