const createDbMock = (rows = []) => {
  const calls = {
    table: null,
    where: [],
    andWhere: [],
    orderBy: [],
    limit: null,
    offset: null,
    select: null
  };

  const builder = {
    select(...args) {
      calls.select = args;
      return this;
    },
    where(condition) {
      calls.where.push(condition);
      return this;
    },
    andWhere(fn) {
      calls.andWhere.push(fn);
      // simulate query builder callback
      const qb = {
        whereNull: () => qb,
        orWhere: () => qb
      };
      fn(qb);
      return this;
    },
    orderBy(order) {
      calls.orderBy.push(order);
      return this;
    },
    limit(value) {
      calls.limit = value;
      return this;
    },
    offset(value) {
      calls.offset = value;
      return this;
    },
    first() {
      return Promise.resolve(rows[0] || null);
    },
    then(resolve, reject) {
      return Promise.resolve(rows).then(resolve, reject);
    }
  };

  const db = (table) => {
    calls.table = table;
    return builder;
  };

  return { db, calls };
};

module.exports = { createDbMock };
