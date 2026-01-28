# Plano de Casos e Contextos

Este arquivo consolida os casos previstos para testes de API e E2E. Cada linha indica o contexto necessário e o caso que deve ser validado.

## API - Autenticação
- [API-AUTH-01] Caso: login com email/senha retorna token | Contexto: cliente existente com credenciais válidas.
- [API-AUTH-02] Caso: login com credenciais inválidas retorna 401/400 | Contexto: email inexistente ou senha incorreta.
- [API-AUTH-03] Caso: registro de cliente retorna token | Contexto: email ainda não cadastrado.
- [API-AUTH-04] Caso: registro duplicado retorna erro controlado | Contexto: email já cadastrado.
- [API-AUTH-05] Caso: início de login social retorna location ou token | Contexto: provedor habilitado (google/facebook/apple).
- [API-AUTH-06] Caso: callback social inválido retorna erro | Contexto: code/state inválidos ou expirados.
- [API-AUTH-07] Caso: registro store + criação de empresa | Contexto: endpoint `/auth/store/emailpass/register` ativo e payload válido.

## API - Clientes
- [API-CUST-01] Caso: GET `/store/customers/me` | Contexto: token válido; cliente aprovado e não aprovado.
- [API-CUST-02] Caso: POST `/store/customers/me` atualiza perfil | Contexto: token válido; campos obrigatórios preenchidos.
- [API-CUST-03] Caso: POST `/store/customers/me` preserva metadata existente | Contexto: cliente com metadata prévia.
- [API-CUST-04] Caso: POST `/store/customers/password` altera senha | Contexto: token válido e senha atual correta.
- [API-CUST-05] Caso: POST `/store/customers/password` falha com senha atual incorreta | Contexto: token válido.

## API - Empresas (Condomínios)
- [API-COMP-01] Caso: GET `/store/companies` lista empresas do cliente | Contexto: token válido.
- [API-COMP-02] Caso: POST `/store/companies` cria empresa | Contexto: payload com `trade_name`, `fantasy_name`, `cnpj` válido.
- [API-COMP-03] Caso: POST `/store/companies` valida CNPJ | Contexto: CNPJ inválido.
- [API-COMP-04] Caso: PATCH `/store/companies/:id` atualiza metadata | Contexto: empresa existente.
- [API-COMP-05] Caso: POST `/store/companies/:id/points` soma pontos | Contexto: pedido existente e empresa aprovada.
- [API-COMP-06] Caso: POST `/store/companies/:id/transfer` cria transferência | Contexto: email válido, datas válidas ou permanente.
- [API-COMP-07] Caso: POST `/store/companies/:id/transfer` valida datas | Contexto: start_date > end_date.

## API - Recorrências
- [API-REC-01] Caso: GET `/store/recurrences` | Contexto: token válido.
- [API-REC-02] Caso: POST `/store/recurrences` semanal | Contexto: day_of_week válido.
- [API-REC-03] Caso: POST `/store/recurrences` quinzenal | Contexto: day_of_week válido.
- [API-REC-04] Caso: POST `/store/recurrences` mensal | Contexto: day_of_month válido (1-31).
- [API-REC-05] Caso: POST `/store/recurrences` valida itens | Contexto: itens sem variant_id ou quantity inválida.
- [API-REC-06] Caso: PATCH `/store/recurrences/:id` pausa/retoma | Contexto: recorrência existente.
- [API-REC-07] Caso: DELETE `/store/recurrences/:id` remove | Contexto: recorrência existente.

## API - Notícias e Banners
- [API-NEWS-01] Caso: GET `/store/news` lista com paginação | Contexto: banco com múltiplas notícias.
- [API-NEWS-02] Caso: GET `/store/news/:id` retorna detalhes | Contexto: id válido.
- [API-BANN-01] Caso: GET `/store/marketing-banners` lista com paginação | Contexto: banners cadastrados.

## API - Push e Pagamentos Pendentes
- [API-PUSH-01] Caso: POST `/store/push-tokens` cria token | Contexto: subscription válida.
- [API-PUSH-02] Caso: POST `/store/push-tokens` atualiza token existente | Contexto: mesmo device_id/subscription.
- [API-PUSH-03] Caso: DELETE `/store/push-tokens` remove token | Contexto: token registrado.
- [API-PEND-01] Caso: POST `/store/notifications/pending-payment` registra pendência | Contexto: payment_collection_id válido.
- [API-PEND-02] Caso: sincronização de pendências no metadata do cliente | Contexto: customer.metadata com pendências.

## API - Comércio (Medusa Store)
- [API-COMM-01] Caso: GET `/store/products` retorna preços calculados | Contexto: produtos com variants e preços.
- [API-COMM-02] Caso: GET `/store/products/:id` retorna detalhes | Contexto: id válido.
- [API-COMM-03] Caso: POST `/store/carts` cria carrinho | Contexto: sales_channel/region configurados.
- [API-COMM-04] Caso: POST `/store/carts/:id/line-items` adiciona item | Contexto: variant_id válido.
- [API-COMM-05] Caso: POST `/store/carts/:id/line-items/:line_id` atualiza quantidade | Contexto: line_id existente.
- [API-COMM-06] Caso: DELETE `/store/carts/:id/line-items/:line_id` remove item | Contexto: line_id existente.
- [API-COMM-07] Caso: GET `/store/shipping-options?cart_id=` retorna opções | Contexto: carrinho válido.
- [API-COMM-08] Caso: POST `/store/carts/:id/shipping-methods` aplica frete | Contexto: option_id válido.
- [API-COMM-09] Caso: POST `/store/payment-collections` cria coleção | Contexto: cart_id válido.
- [API-COMM-10] Caso: POST `/store/payment-collections/:id/payment-sessions` define sessão | Contexto: provider_id válido.
- [API-COMM-11] Caso: POST `/store/carts/:id/complete` gera pedido | Contexto: pagamento aprovado.
- [API-COMM-12] Caso: GET `/store/orders` lista pedidos do cliente | Contexto: token válido.

## API - Admin
- [API-ADM-01] Caso: GET `/admin/companies` | Contexto: admin autenticado.
- [API-ADM-02] Caso: GET `/admin/companies/pending` | Contexto: admin autenticado.
- [API-ADM-03] Caso: PATCH `/admin/companies/:id` atualiza empresa | Contexto: admin autenticado.
- [API-ADM-04] Caso: POST `/admin/companies/:id/approve` aprova | Contexto: empresa pendente.
- [API-ADM-05] Caso: POST `/admin/companies/:id/reject` rejeita | Contexto: empresa pendente.
- [API-ADM-06] Caso: GET/POST `/admin/news` | Contexto: admin autenticado.
- [API-ADM-07] Caso: DELETE `/admin/news/:id` | Contexto: news existente.
- [API-ADM-08] Caso: GET/POST `/admin/marketing-banners` | Contexto: admin autenticado.
- [API-ADM-09] Caso: PATCH/DELETE `/admin/marketing-banners/:id` | Contexto: banner existente.
- [API-ADM-10] Caso: GET `/admin/store-users` | Contexto: admin autenticado.
- [API-ADM-11] Caso: POST `/admin/store-users/send-password` | Contexto: email de usuário existente.
- [API-ADM-12] Caso: POST `/admin/store-users/:id/reset-password` | Contexto: usuário existente.
- [API-ADM-13] Caso: POST `/admin/store-users/:id/status` ativa/desativa | Contexto: usuário existente.
- [API-ADM-14] Caso: GET/POST `/admin/push-notifications` | Contexto: admin autenticado.
- [API-ADM-15] Caso: POST `/admin/push-notifications/process` processa fila | Contexto: notificações pendentes.
- [API-ADM-16] Caso: POST `/admin/push-notifications/resend` | Contexto: id de notificação existente.

## API - Hooks
- [API-HOOK-01] Caso: POST `/hooks/payment/:provider` retorna 200 | Contexto: provider configurado.

## E2E - Navegação e Sessão
- [E2E-NAV-01] Caso: acessar `/` e navegar para login | Contexto: usuário não autenticado.
- [E2E-NAV-02] Caso: logout retorna para landing | Contexto: usuário autenticado.
- [E2E-NAV-03] Caso: usuário pendente redireciona para `/access-pending` | Contexto: empresa não aprovada.
- [E2E-NAV-04] Caso: rota inválida exibe 404 | Contexto: URL inexistente.

## E2E - Autenticação
- [E2E-AUTH-01] Caso: login com credenciais válidas | Contexto: usuário aprovado com empresa vinculada.
- [E2E-AUTH-02] Caso: login inválido mostra erro | Contexto: credenciais incorretas.
- [E2E-AUTH-03] Caso: cadastro com campos inválidos | Contexto: nome vazio ou senha curta.
- [E2E-AUTH-04] Caso: cadastro válido direciona para vínculo de empresa | Contexto: email novo.
- [E2E-AUTH-05] Caso: login social inicia fluxo | Contexto: provider habilitado.

## E2E - Vínculo de Empresas
- [E2E-COMP-01] Caso: validação de CNPJ inválido | Contexto: campo CNPJ preenchido incorretamente.
- [E2E-COMP-02] Caso: upload de documento obrigatório | Contexto: formulário sem arquivo.
- [E2E-COMP-03] Caso: limite máximo de 10 empresas | Contexto: adicionar 11ª empresa.
- [E2E-COMP-04] Caso: não permitir remover a última empresa | Contexto: apenas 1 empresa no formulário.
- [E2E-COMP-05] Caso: envio com sucesso navega para onboarding | Contexto: dados válidos.

## E2E - Onboarding e Acesso Pendente
- [E2E-ONB-01] Caso: onboarding dispara toast e redireciona | Contexto: fluxo pós-vínculo.
- [E2E-PEND-01] Caso: acesso pendente oferece ações | Contexto: usuário sem empresa aprovada.

## E2E - Home
- [E2E-HOME-01] Caso: carrega promoções e notícias | Contexto: API com dados.
- [E2E-HOME-02] Caso: banner carrossel muda automaticamente | Contexto: mais de 1 banner.
- [E2E-HOME-03] Caso: clique em banner abre destino correto | Contexto: banner com link_type e link_value.
- [E2E-HOME-04] Caso: adicionar promoção ao carrinho | Contexto: produto em promoção com variantId.

## E2E - Catálogo (Dashboard)
- [E2E-CAT-01] Caso: listagem inicial de produtos | Contexto: empresa selecionada.
- [E2E-CAT-02] Caso: filtros por categoria e preço | Contexto: produtos com múltiplas categorias.
- [E2E-CAT-03] Caso: ordenação por nome/preço | Contexto: múltiplos produtos.
- [E2E-CAT-04] Caso: toggle "apenas promoções" | Contexto: produtos com price_list sale.
- [E2E-CAT-05] Caso: scroll infinito carrega mais | Contexto: catálogo > 6 itens.
- [E2E-CAT-06] Caso: adicionar item ao carrinho | Contexto: produto com variant disponível.

## E2E - Produto
- [E2E-PROD-01] Caso: abrir detalhe de produto | Contexto: produto válido.
- [E2E-PROD-02] Caso: trocar variante e atualizar preço | Contexto: produto com múltiplas variantes.
- [E2E-PROD-03] Caso: galeria exibe imagens/vídeos | Contexto: mídia em metadata.
- [E2E-PROD-04] Caso: adicionar quantidade ao carrinho | Contexto: estoque disponível.

## E2E - Carrinho
- [E2E-CART-01] Caso: abrir drawer do carrinho | Contexto: usuário com itens.
- [E2E-CART-02] Caso: incrementar/decrementar quantidade | Contexto: item no carrinho.
- [E2E-CART-03] Caso: remover item | Contexto: item no carrinho.
- [E2E-CART-04] Caso: limpar carrinho | Contexto: múltiplos itens.

## E2E - Checkout
- [E2E-CHK-01] Caso: carrinho vazio bloqueia finalização | Contexto: nenhum item.
- [E2E-CHK-02] Caso: validação de condomínio obrigatório | Contexto: campo vazio.
- [E2E-CHK-03] Caso: finalizar com cartão | Contexto: sessão de pagamento configurada.
- [E2E-CHK-04] Caso: finalizar com PIX e exibir QR/expiração | Contexto: método pix configurado.
- [E2E-CHK-05] Caso: finalizar com boleto e exibir linha digitável | Contexto: método boleto configurado.
- [E2E-CHK-06] Caso: marcar compra recorrente | Contexto: itens no carrinho.
- [E2E-CHK-07] Caso: retorno de pagamento pendente abre tela | Contexto: `?pending=` válido.

## E2E - Pedidos
- [E2E-ORD-01] Caso: listar pedidos do cliente | Contexto: pedidos existentes.
- [E2E-ORD-02] Caso: abrir detalhes do pedido | Contexto: pedido com itens.
- [E2E-ORD-03] Caso: copiar endereço/linha digitável | Contexto: pedido com dados de entrega.
- [E2E-ORD-04] Caso: criar recorrência a partir de pedido | Contexto: pedido com itens recorrentes.
- [E2E-ORD-05] Caso: visualizar pendências de pagamento | Contexto: pendências no metadata.

## E2E - Recorrências
- [E2E-REC-01] Caso: listar recorrências | Contexto: recorrências existentes.
- [E2E-REC-02] Caso: pausar/retomar recorrência | Contexto: recorrência ativa.
- [E2E-REC-03] Caso: remover recorrência | Contexto: recorrência existente.

## E2E - Configurações
- [E2E-SET-01] Caso: carregar dados do perfil | Contexto: cliente autenticado.
- [E2E-SET-02] Caso: atualizar perfil com telefone formatado | Contexto: campos válidos.
- [E2E-SET-03] Caso: alterar senha com validação | Contexto: senha atual correta.

## E2E - Condomínios (Gestão)
- [E2E-COND-01] Caso: listar condomínios do usuário | Contexto: empresas vinculadas.
- [E2E-COND-02] Caso: criar condomínio | Contexto: dados válidos e CNPJ válido.
- [E2E-COND-03] Caso: editar condomínio | Contexto: empresa existente.
- [E2E-COND-04] Caso: remover condomínio | Contexto: confirmação ativa.
- [E2E-COND-05] Caso: transferência de condomínio | Contexto: email válido, data/periodicidade.
- [E2E-COND-06] Caso: busca automática de CEP | Contexto: CEP válido (quando API habilitada).
