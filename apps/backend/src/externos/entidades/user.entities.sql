CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE usuarios (
    -- Identificador único e chave primária aleatória
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Armazenar hash, nunca texto puro
    
    -- Configurações flexíveis em JSON
    cfgtoken JSONB DEFAULT '{}'::jsonb,
    
    -- Flags e controles
    deletado BOOLEAN DEFAULT false,
    isRoot CHAR(1) DEFAULT 'N',      -- 'S' ou 'N' para superusuário
    status VARCHAR(50) DEFAULT 'ativo',
    data_bloqueio VARCHAR(50),       -- Considere usar TIMESTAMP futuramente
    enviar_relatorio BOOLEAN DEFAULT false,
    doisFatores BOOLEAN DEFAULT false,
    
    -- Dados de contato e foto
    num_wpp INTEGER,                 -- Número de WhatsApp (apenas dígitos)
    urlPhoto TEXT,
    
    -- Datas (formato DATE)
    createdAt DATE DEFAULT CURRENT_DATE,
    updatedAt DATE DEFAULT CURRENT_DATE,
    
    -- Informações de auditoria/modificação
    ultima_modif VARCHAR(255),       -- Descrição da última modificação
    
    -- Termo de consentimento aprovado (ID referente a outra tabela)
    termoApproved INTEGER,           -- FK para tabela de termos (se existir)

    firstLogin BOOLEAN DEFAULT true,    -- Indica se é o primeiro login do usuário
    isActive BOOLEAN DEFAULT true,      -- Indica se o usuário está ativo ou inativo
    
    -- Restrições
    CONSTRAINT unique_email UNIQUE (email)
);
