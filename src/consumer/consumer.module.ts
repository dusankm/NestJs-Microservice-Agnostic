// src/consumer/consumer.module.ts
import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { ConsumerController } from './consumer.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { getDLQClientOptions } from '../messaging/messaging-connection.config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ConfigModule, // Asegura que ConfigModule esté disponible
    ClientsModule.registerAsync([
      {
        name: 'DLQ_CLIENT',
        imports: [ConfigModule], // Importa ConfigModule aquí para que ConfigService esté disponible
        useFactory: getDLQClientOptions,
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ConsumerController],
  providers: [ConsumerService],
})
export class ConsumerModule {}
