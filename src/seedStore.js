
export class SeedStore {
  static async fetchSeeds() {
    return fetch('src/seeds.json', {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
      }
    })
  }
}
