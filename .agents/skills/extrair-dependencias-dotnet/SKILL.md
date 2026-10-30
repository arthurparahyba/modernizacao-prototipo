---
name: extrair-dependencias-dotnet
description: "Use ao mapear dependências em aplicações .NET (Framework e Core): ASP.NET MVC e Web API, Web Forms, WCF, Entity Framework, ADO.NET, MSMQ e jobs agendados."
---

# Dependências em .NET

## Pontos de entrada

- Controllers MVC e Web API (`[Route]`, `[HttpGet]`, convenção `{controller}/{action}`; ver `RouteConfig.cs`).
- Páginas Web Forms (`*.aspx`): cada página de negócio é um ponto de entrada `screen`.
- Serviços WCF (`*.svc`, `[ServiceContract]`).
- Jobs: Hangfire, Quartz.NET, Windows Services e tarefas agendadas descritas no repositório.

## Chamadas de saída

- `HttpClient`, `WebClient`, `RestSharp`: siga a URL até o `web.config` ou `appsettings*.json`.
- Clientes WCF gerados (`Service References`, `<client><endpoint address=...>` no `web.config`).
- MSMQ (`MessageQueue.Send`) e RabbitMQ / Azure Service Bus.

## Dados

- Entity Framework: `DbSet<>`, `[Table]`, migrations e `.edmx`.
- ADO.NET: `SqlCommand("...")`, `CommandType.StoredProcedure` (registre a procedure como `call`).
- Connection strings em `web.config` / `appsettings`: registre o banco, nunca usuário e senha.
- Relatórios (SSRS `.rdl`, Crystal Reports): o dataset aponta para tabelas e procedures.
