// src/producer/producer.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OrderDto } from '../dtos/order.dto';
import { ProducerService } from './producer.service';

@Controller('orders')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  @Post('place-order')
  placeOrder(@Body() order: OrderDto) {
    return this.producerService.placeOrder(order);
  }

  @Get()
  getOrders() {
    return this.producerService.getOrders();
  }

  @Get('pokemon')
  getPokemon(@Query('name') name: string) {
    return this.producerService.getPokemon({ name });
  }
}
