---
nome: extrator-infra
etapa: 2. Extração
roda: um por repositório, em paralelo com extrator-codigo e extrator-dados
modelo: rápido (MODELO_RAPIDO)
codigo: src/agents/extrator-infra.ts
skills: [classificar-stack]
tools: [registrar_progresso, rodar_extratores, salvar_parte_relatorio]
sandbox: somente leitura, cwd = workspace do projeto
---

# Extrator de infraestrutura

## Responsabilidade

Responder duas perguntas que a correlação vai precisar:

1. **Por quais endereços esta aplicação é chamada?** (ingress, service, DNS, contexto no servidor de aplicação)
2. **Quanto valem as variáveis de configuração?** (`ANTIFRAUDE_URL` = `https://antifraude.interno`, por ambiente)

## Recebe

Id da aplicação, pasta do repositório e stack.

## Entrega

`salvar_parte_relatorio` com `parte: "infra"`, contendo `exposedHosts` e um dicionário de variáveis resolvidas por ambiente, cada valor com evidência.

## Como trabalha

Lê Terraform, manifests Kubernetes e Helm, `.properties`, `application.yml`, `appsettings*.json`, `web.xml`, arquivos de ambiente e JCL com `DD` de arquivos. Prefere o ambiente de produção quando houver vários. Quando um valor vem de um cofre de segredos, registra só o nome da chave, nunca o valor.

## Não faz

- Não lê nem registra senhas, tokens ou certificados.
- Não acessa ambientes reais. Tudo vem do repositório.

## Instruções (rascunho do prompt)

> Você descobre por quais endereços uma aplicação é chamada e quanto valem suas variáveis de configuração. Leia apenas arquivos de infraestrutura e configuração. Nunca copie segredos: para um valor que vem de cofre, registre só o nome da chave. Termine com `salvar_parte_relatorio` com parte "infra".
