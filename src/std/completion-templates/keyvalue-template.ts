export default `
/**
 * Auto generated code for a keyvalue store.
 * 
 * You can update this comment block and it will reflect
 * it as description on the playground!
*/  
@Injectable
@KeyValue
class NewKeyValueStore {

    @Show
    data: Map<string, string> = new Map();

    set(key: string, value: string) {
        this.data.set(key, value);
    }

    get(key: string) {
        this.data.get(key);
    }

    delete(key: string) {
        this.data.delete(key);
    }

}`;
