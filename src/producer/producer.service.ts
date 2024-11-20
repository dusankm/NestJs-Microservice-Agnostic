// src/producer/producer.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OrderDto } from '../dtos/order.dto';
import { timeout } from 'rxjs';
import { PokemonDto } from '../dtos/pokemon.dto';

@Injectable()
export class ProducerService {
  constructor(
    @Inject('ORDERS_PRODUCER') private readonly clientProxy: ClientProxy,
  ) {}

  placeOrder(order: OrderDto) {
    this.clientProxy.emit('order-placed', order);
    return { message: 'Order Placed!' };
  }

  getOrders() {
    return this.clientProxy
      .send({ cmd: 'fetch-orders' }, {})
      .pipe(timeout(5000));
  }

  getPokemon(pokemon: PokemonDto) {
    return this.clientProxy
      .send({ cmd: 'fetch-pokemon' }, pokemon)
      .pipe(timeout(5000)); // Tiempo de espera para la respuesta
  }
}
