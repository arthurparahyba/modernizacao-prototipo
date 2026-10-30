---
name: extrair-dependencias-java
description: "Use ao mapear pontos de entrada, chamadas de saída e acesso a dados em aplicações Java (Java EE, EJB, Struts, Spring, JAX-RS, JAX-WS, JPA, JDBC). Diz o que os parsers já cobrem e onde procurar o que eles perdem."
---

# Dependências em Java

## O que `rodar_extratores` já entrega

- Endpoints JAX-RS (`@Path`, `@GET`…) e Spring MVC (`@RequestMapping`, `@GetMapping`…).
- Actions do Struts declaradas em `struts-config.xml`.
- Serviços JAX-WS (`@WebService`) e WSDLs no repositório.
- Entidades JPA (`@Entity`, `@Table`) e `persistence.xml`.
- Chamadas com `RestTemplate`, `WebClient`, Feign e clientes JAX-WS gerados.

Esses itens vêm com `extractor: parser:*` e confiança 1. Não refaça; só complete.

## Onde os parsers falham (procure aqui)

1. **Cliente HTTP caseiro**: classes que usam `HttpURLConnection`, Apache HttpClient ou OkHttp com a URL montada por concatenação. Procure por `openConnection(`, `HttpPost(`, `new Request.Builder()`.
2. **URL vinda de configuração**: siga a variável até o `.properties` ou `System.getProperty`. Registre o alvo **como está escrito**, com o nome da variável.
3. **JNDI e EJB remoto**: `InitialContext.lookup("...")` é uma chamada de saída para outra aplicação. Registre o nome JNDI como alvo.
4. **SQL em string**: `prepareStatement("SELECT ... FROM X")`, `createNativeQuery`. Extraia tabela e operação.
5. **Mensageria**: `JmsTemplate`, `MessageProducer`, `@JmsListener`, `MQQueueManager` (IBM MQ). Produtor é chamada de saída; listener é ponto de entrada.
6. **Jobs**: `@Scheduled`, Quartz (`Job`), EJB `@Schedule`. São pontos de entrada do tipo `cron`.

## Pontos de entrada de negócio

Marque `businessFacing: true` para telas e endpoints usados por cliente ou operador. Endpoints de health check, métricas e administração técnica ficam `false`.
