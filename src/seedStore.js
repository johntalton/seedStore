
export class SeedStore {
  static async fetchSeeds() {
    const result = await fetch('src/seeds.json', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
      }
    })

    return result
  }

  static async fetchSeed(name) {

  }
}
