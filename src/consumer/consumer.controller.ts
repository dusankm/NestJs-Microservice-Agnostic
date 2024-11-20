// src/consumer/consumer.controller.ts
import { Controller, Inject } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  MessagePattern,
  ClientProxy,
} from '@nestjs/microservices';
import { OrderDto } from '../dtos/order.dto';
import { PokemonDto } from '../dtos/pokemon.dto';

@Controller()
export class ConsumerController {
  constructor(
    private readonly consumerService: ConsumerService,
    @Inject('DLQ_CLIENT') private readonly dlqClient: ClientProxy,
  ) {}

  @EventPattern('order-placed')
  async handleOrderPlaced(
    @Payload() order: OrderDto,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      await this.consumerService.processOrder(order);
      channel.ack(originalMessage);
    } catch (error) {
      console.error(`Error processing order ${order.email}:`, error.message);
      await this.consumerService.retryOrDeadLetter(
        order,
        originalMessage,
        channel,
        this.dlqClient,
      );
    }
  }

  @MessagePattern({ cmd: 'fetch-orders' })
  async getOrders(@Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      const orders = await this.consumerService.getOrders();
      channel.ack(originalMessage);
      return orders;
    } catch (error) {
      console.error(`Error fetching orders: ${error.message}`);
      channel.nack(originalMessage, false, true); // Requeue para reintentos
      throw error;
    }
  }

  @MessagePattern({ cmd: 'fetch-pokemon' })
  async fetchPokemon(@Payload() pokemon: PokemonDto, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      const result = await this.consumerService.fetchPokemon(pokemon.name);
      channel.ack(originalMessage);
      return result;
    } catch (error) {
      console.error(`Error fetching Pokémon data: ${error.message}`);
      channel.nack(originalMessage, false, true); // Requeue para reintentos
      throw error;
    }
  }
}
