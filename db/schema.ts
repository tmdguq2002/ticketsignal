import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const productFirstSeen=sqliteTable('product_first_seen',{
 sourceKey:text('source_key').primaryKey(),firstSeenAt:text('first_seen_at').notNull()
});
export const ticketInterests=sqliteTable('ticket_interests',{
 visitorId:text('visitor_id').notNull(),sourceKey:text('source_key').notNull()
},table=>[primaryKey({columns:[table.visitorId,table.sourceKey]})]);
