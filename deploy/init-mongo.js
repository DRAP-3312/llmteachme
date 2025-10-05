// Script de inicialización de MongoDB
// Se ejecuta automáticamente la primera vez que se crea el contenedor

db = db.getSiblingDB('llmteachme');

print('🔧 Inicializando base de datos llmteachme...');

// Crear índices críticos

// User collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });
print('✅ Índices de User creados');

// Conversation collection
db.conversations.createIndex({ "userId": 1 });
db.conversations.createIndex({ "isActive": 1 });
db.conversations.createIndex({ "userId": 1, "isActive": 1 });
db.conversations.createIndex({ "createdAt": -1 });
print('✅ Índices de Conversation creados');

// Message collection
db.messages.createIndex({ "conversationId": 1 });
db.messages.createIndex({ "conversationId": 1, "createdAt": 1 });
db.messages.createIndex({ "role": 1 });
print('✅ Índices de Message creados');

// PromptTemplate collection
db.prompttemplates.createIndex({ "name": 1 }, { unique: true });
db.prompttemplates.createIndex({ "layer": 1 });
db.prompttemplates.createIndex({ "isActive": 1 });
db.prompttemplates.createIndex({ "layer": 1, "isActive": 1 });
db.prompttemplates.createIndex({ "priority": -1 });
print('✅ Índices de PromptTemplate creados');

print('✅ Inicialización de MongoDB completada');
