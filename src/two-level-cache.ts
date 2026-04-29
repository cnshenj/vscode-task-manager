export class TwoLevelCache<OuterKey, InnerKey, Value> {
  private readonly layers = new Map<OuterKey, Promise<Map<InnerKey, Value>>>();

  public getValues(
    outerKey: OuterKey,
    factory: () => Promise<Map<InnerKey, Value>>,
  ): Promise<Value[]> {
    return this.getLayer(outerKey, factory).then((layer) =>
      Array.from(layer.values()),
    );
  }

  public deleteLayer(outerKey: OuterKey): boolean {
    return this.layers.delete(outerKey);
  }

  public updateValue(
    outerKey: OuterKey,
    innerKey: InnerKey,
    factory: () => Promise<Value | undefined>,
  ): boolean {
    const cachedLayer = this.layers.get(outerKey);
    if (!cachedLayer) {
      return false;
    }

    const layer = cachedLayer
      .then(async (values) => {
        const value = await factory();
        if (value !== undefined) {
          values.set(innerKey, value);
        } else {
          values.delete(innerKey);
        }

        return values;
      })
      .catch((error) => {
        this.layers.delete(outerKey);
        throw error;
      });

    this.layers.set(outerKey, layer);
    return true;
  }

  private getLayer(
    outerKey: OuterKey,
    factory: () => Promise<Map<InnerKey, Value>>,
  ): Promise<Map<InnerKey, Value>> {
    const cachedLayer = this.layers.get(outerKey);
    if (cachedLayer) {
      return cachedLayer;
    }

    const layer = factory().catch((error) => {
      this.layers.delete(outerKey);
      throw error;
    });
    this.layers.set(outerKey, layer);
    return layer;
  }
}
