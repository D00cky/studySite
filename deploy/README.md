# Deploy do StudySite (VPS com Docker)

Uma imagem só: a API Spring serve também a SPA compilada, na mesma origem (sessão e CSRF
funcionam sem configuração extra). O PostgreSQL roda num container próprio, numa rede interna,
e o HTTPS fica com um **Traefik que já existe na máquina** (o app só se pendura nele via labels).

## Primeira vez

```sh
git clone https://github.com/D00cky/studySite.git /srv/studysite
cd /srv/studysite/deploy
cp .env.example .env
# Preencha DOMAIN (apontando para o IP da VPS) e DB_PASSWORD (openssl rand -base64 32).
docker compose up -d --build
docker compose logs -f app   # espere "Started BackendApplication"
```

O Traefik precisa enxergar o projeto `studysite`. Se ele usa `--providers.docker.constraints`
(como na VPS atual, que só publicava `fiscview-staging`), inclua o projeto na regra:

```
--providers.docker.constraints=Label(`com.docker.compose.project`,`fiscview-staging`) || Label(`com.docker.compose.project`,`studysite`)
```

## Contas do time e cadastro

1. Com `REGISTRATION_ENABLED=true`, cada pessoa cria a conta em `https://DOMAIN/cadastro`.
2. Depois, feche o cadastro: `REGISTRATION_ENABLED=false` no `deploy/.env` e `docker compose up -d`.

O perfil `demo` (contas com senha conhecida) **nunca** é ativado aqui.

## Atualizar

```sh
cd /srv/studysite && git pull && cd deploy && docker compose up -d --build
```

As migrações Flyway rodam sozinhas na subida.

## Backup do banco

```sh
cd /srv/studysite/deploy
docker compose exec -T db pg_dump -U studysite studysite | gzip > ~/studysite-$(date +%F).sql.gz
```

Restaurar (em um banco vazio): `gunzip -c arquivo.sql.gz | docker compose exec -T db psql -U studysite studysite`.
