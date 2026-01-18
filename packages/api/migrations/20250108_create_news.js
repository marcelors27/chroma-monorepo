const { Migration } = require("@mikro-orm/migrations")

class Migration20250108 extends Migration {
  async up() {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "news" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "summary" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "category" TEXT,
        "image_url" TEXT,
        "author" TEXT,
        "source" TEXT,
        "read_time" INTEGER,
        "published_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "is_published" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    this.addSql(`
      INSERT INTO "news" (
        "id",
        "title",
        "summary",
        "content",
        "category",
        "image_url",
        "author",
        "source",
        "read_time",
        "published_at",
        "is_published",
        "created_at",
        "updated_at"
      )
      SELECT * FROM (VALUES
        (
          'news-001',
          $$Nova linha de produtos sustentaveis$$,
          $$Chegaram produtos eco-friendly para condominios com foco em economia de recursos.$$
          ,
          $$<p>Apresentamos a nova linha sustentavel da Chroma, pensada para reduzir desperdicios e melhorar a manutencao do condominio.</p>
            <h3>O que voce encontra</h3>
            <p>Produtos de limpeza biodegradaveis, itens reciclados para areas comuns e iluminacao LED de alta eficiencia.</p>
            <h3>Beneficios imediatos</h3>
            <ul>
              <li>Economia de energia com LED</li>
              <li>Menos descarte com embalagens reciclaveis</li>
              <li>Produtos mais seguros para moradores</li>
            </ul>
            <h3>Condicoes de lancamento</h3>
            <p>Durante o mes, toda a linha sustentavel conta com condicoes especiais.</p>$$,
          'Novidades',
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
          'Equipe Chroma',
          'Equipe Chroma',
          3,
          '2024-12-15T09:00:00Z'::timestamptz,
          TRUE,
          now(),
          now()
        ),
        (
          'news-002',
          $$Dicas de economia para sindicos$$,
          $$Veja como reduzir custos do condominio com compras planejadas.$$
          ,
          $$<p>Planejar compras e negociar com fornecedores e uma das melhores formas de economizar.</p>
            <h3>Planeje com antecedencia</h3>
            <p>Evite compras emergenciais e mantenha um estoque minimo dos itens essenciais.</p>
            <h3>Compare e negocie</h3>
            <p>Revise fornecedores periodicamente e aproveite descontos por volume.</p>
            <h3>Qualidade importa</h3>
            <p>Produtos duraveis reduzem custos de manutencao ao longo do tempo.</p>$$,
          'Dicas',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
          'Maria Silva',
          'Equipe Chroma',
          5,
          '2024-12-10T10:30:00Z'::timestamptz,
          TRUE,
          now(),
          now()
        ),
        (
          'news-003',
          $$Promocao de fim de ano chegando$$,
          $$Fique atento as ofertas especiais para condominios no fim do ano.$$
          ,
          $$<p>O fim de ano esta chegando e a Chroma prepara descontos em itens essenciais.</p>
            <h3>Datas importantes</h3>
            <ul>
              <li>20/12: inicio da promocao</li>
              <li>24/12: ofertas relampago</li>
              <li>31/12: ultimo dia com frete especial</li>
            </ul>
            <h3>Como aproveitar</h3>
            <p>Cadastre-se para receber alertas de novas ofertas e cupons exclusivos.</p>$$,
          'Promocoes',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
          'Equipe Chroma',
          'Equipe Chroma',
          2,
          '2024-12-08T12:00:00Z'::timestamptz,
          TRUE,
          now(),
          now()
        )
      ) AS seed (
        "id",
        "title",
        "summary",
        "content",
        "category",
        "image_url",
        "author",
        "source",
        "read_time",
        "published_at",
        "is_published",
        "created_at",
        "updated_at"
      )
      WHERE NOT EXISTS (SELECT 1 FROM "news");
    `)
  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "news";')
  }
}

module.exports = { default: Migration20250108 }
