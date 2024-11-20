// src/consumer/consumer.service.ts

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { OrderDto } from '../dtos/order.dto';

@Injectable()
export class ConsumerService {
  private orders: OrderDto[] = [];
  private retryCounts: { [key: string]: number } = {};
  private processingRetry = false;

  constructor(private readonly httpService: HttpService) {}

  async processOrder(order: OrderDto): Promise<{ message: string }> {
    console.log(`Processing order for customer: ${order.email}`);

    if (order.email.includes('error')) {
      throw new Error('Simulated processing error');
    }
    this.orders.push(order);

    return { message: 'Order processed successfully' };
  }

  async getOrders(): Promise<OrderDto[]> {
    return this.orders;
  }

  async fetchPokemon(name: string): Promise<any> {
    return this.processRetries(
      () => this.executeFetchPokemon(name),
      name,
    );
  }

  private async executeFetchPokemon(name: string): Promise<any> {
    if (name.includes('error')) {
      throw new Error('Simulated Pokémon error'); // Simulación de error
    }

    const url = `https://pokeapi.co/api/v2/pokemon/${name}`;
    const response = await lastValueFrom(this.httpService.get(url));
    return response.data;
  }

  /**
   * Función genérica para manejar reintentos con backoff exponencial.
   * @param task Función a ejecutar que puede fallar y ser reintentada.
   * @param identifier Identificador único para el control de reintentos (email, name, etc.).
   * @param maxRetries Número máximo de reintentos (default: 3).
   */
  private async processRetries(
    task: () => Promise<any>,
    identifier: string,
    maxRetries = 3,
  ): Promise<any> {
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        return await task(); // Ejecuta la tarea
      } catch (error) {
        retryCount++;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || retryCount > maxRetries) {
          throw new Error(
            `Failed to process ${identifier} after ${retryCount} attempts: ${error.message}`,
          );
        }

        // Retraso exponencial antes del siguiente intento
        const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
        console.log(`Retrying ${identifier} in ${delay}ms (Attempt ${retryCount})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private isRetryableError(error: any): boolean {
    // Reintentar para errores de red o códigos de estado 5xx
    if (!error.response) {
      return true; // Error de red
    }
    const status = error.response.status;
    return status >= 500 && status < 600; // Sólo reintentar para 5xx
  }

  async retryOrDeadLetter(
    order: OrderDto,
    originalMessage: any,
    channel: any,
    dlqClient: ClientProxy,
  ) {
    const messageId = order.email;
    this.retryCounts[messageId] = (this.retryCounts[messageId] || 0) + 1;

    try {
      await this.processRetries(
        () => this.processOrder(order),
        order.email,
      );
      channel.ack(originalMessage);
    } catch (error) {
      console.error(`Max retries reached for ${order.email}: ${error.message}`);
      await lastValueFrom(dlqClient.emit('dead_letter_queue', order));
      channel.ack(originalMessage); // Asegura que no se reencole
    }
  }
}
