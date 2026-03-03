import * as Spacetime from 'spacetimedb';

export const DbConnectionBuilder = (Spacetime as any).DbConnectionBuilder;
export const DbConnectionImpl = (Spacetime as any).DbConnectionImpl;
export const SubscriptionBuilderImpl = (Spacetime as any).SubscriptionBuilderImpl;
export const TypeBuilder = (Spacetime as any).TypeBuilder;
export const Uuid = (Spacetime as any).Uuid;
export const convertToAccessorMap = (Spacetime as any).convertToAccessorMap;
export const makeQueryBuilder = (Spacetime as any).makeQueryBuilder;
export const procedureSchema = (Spacetime as any).procedureSchema;
export const procedures = (Spacetime as any).procedures;
export const reducerSchema = (Spacetime as any).reducerSchema;
export const reducers = (Spacetime as any).reducers;
export const schema = (Spacetime as any).schema;
export const t = (Spacetime as any).t;
export const table = (Spacetime as any).table;

export type AlgebraicTypeType = any;
export type DbConnectionConfig = any;
export type ErrorContextInterface = any;
export type Event = any;
export type EventContextInterface = any;
export type Infer = any;
export type QueryBuilder<T = any> = any;
export type ReducerEventContextInterface = any;
export type RemoteModule<T = any, U = any, V = any> = any;
export type SubscriptionEventContextInterface = any;
export type SubscriptionHandleImpl = any;

export * from 'spacetimedb';
