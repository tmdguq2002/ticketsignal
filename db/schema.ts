import {sqliteTable,text,primaryKey,integer} from 'drizzle-orm/sqlite-core';
export const productFirstSeen=sqliteTable('product_first_seen',{
 sourceKey:text('source_key').primaryKey(),firstSeenAt:text('first_seen_at').notNull()
});
export const ticketInterests=sqliteTable('ticket_interests',{
 visitorId:text('visitor_id').notNull(),sourceKey:text('source_key').notNull()
},table=>[primaryKey({columns:[table.visitorId,table.sourceKey]})]);

export const emailSubscriptions=sqliteTable('email_subscriptions',{
 id:text('id').primaryKey(),email:text('email').notNull().unique(),keywords:text('keywords').notNull(),verifiedAt:text('verified_at').notNull(),consentVersion:text('consent_version').notNull()
});
export const emailPending=sqliteTable('email_pending',{
 email:text('email').primaryKey(),keywords:text('keywords').notNull(),tokenHash:text('token_hash').notNull().unique(),expiresAt:text('expires_at').notNull(),requestedAt:text('requested_at').notNull(),consentVersion:text('consent_version').notNull()
});
export const emailDeliveries=sqliteTable('email_deliveries',{
 subscriptionId:text('subscription_id').notNull(),eventKey:text('event_key').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),error:text('error')
},t=>[primaryKey({columns:[t.subscriptionId,t.eventKey]})]);
export const emailLimits=sqliteTable('email_limits',{
 key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:text('expires_at').notNull()
});
export const sourceRefreshLock=sqliteTable('source_refresh_lock',{
 name:text('name').primaryKey(),owner:text('owner').notNull(),expiresAt:text('expires_at').notNull()
});
