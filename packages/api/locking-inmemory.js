class InMemoryLockingProvider {
  constructor() {
    this.locks = new Set()
  }

  async acquire(keys) {
    const list = Array.isArray(keys) ? keys : [keys]
    for (const key of list) {
      if (this.locks.has(key)) {
        throw new Error(`Lock for "${key}" is already acquired`)
      }
      this.locks.add(key)
    }
  }

  async release(keys) {
    const list = Array.isArray(keys) ? keys : [keys]
    for (const key of list) {
      this.locks.delete(key)
    }
    return true
  }

  async releaseAll() {
    this.locks.clear()
  }

  async execute(keys, job) {
    await this.acquire(keys)
    try {
      return await job()
    } finally {
      await this.release(keys)
    }
  }
}

InMemoryLockingProvider.identifier = "locking-inmemory"

module.exports = {
  service: InMemoryLockingProvider,
  services: [InMemoryLockingProvider],
}
