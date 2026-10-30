---
name: classificar-stack
description: "Use para decidir se uma aplicação é moderna ou legada e descrever sua stack, a partir de manifestos de build, Dockerfile, CI e configuração. Traz os sinais que contam, como pesar cada um e o formato dos motivos."
---

# Classificar stack

## Onde olhar (nesta ordem)

1. Manifestos de build: `pom.xml`, `build.gradle`, `package.json`, `*.csproj`, `packages.config`, `requirements.txt`, JCL e copybooks.
2. Runtime e empacotamento: `Dockerfile`, `web.xml`, `weblogic.xml`, `jboss-*.xml`, `web.config`.
3. Entrega: `.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, Helm e manifests k8s.
4. Testes: existência de pasta de testes e se o CI roda os testes.

## Sinais

| Sinal | Puxa para |
| --- | --- |
| Runtime sem suporte do fornecedor (Java 8 ou anterior em servidor de aplicação, .NET Framework, Node < 18, Python 2) | legada |
| Framework descontinuado (Struts 1, AngularJS, EJB 2/3 com servidor de aplicação, Web Forms) | legada |
| Mainframe (COBOL, JCL, CICS, IMS) | legada |
| Sem pipeline de CI ou deploy descrito como manual | legada |
| Container e pipeline com deploy automatizado | moderna |
| Runtime e framework com suporte ativo | moderna |
| Testes automatizados rodando no CI | moderna |

Um único sinal forte de legado (mainframe, runtime sem suporte) basta para **legada**. Para **moderna**, exija runtime suportado **e** entrega automatizada.

## Formato dos motivos

Cada motivo é uma frase curta seguida da evidência entre parênteses:

- `Java EE 6 em WebLogic 10.3 (pom.xml:41)`
- `Sem pipeline de CI no repositório`
- `Spring Boot 3.2 em container (Dockerfile:1, pom.xml:12)`

Quando a evidência é a **ausência** de algo, diga onde procurou.
