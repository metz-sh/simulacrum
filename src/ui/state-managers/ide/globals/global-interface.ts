export default `
interface Window {
    /**
     * Enables class to participate in Dependency Injection and makes it
     * available via \`std.resolve\`
     * 
     * @Note But it also means that you can't construct it manually anymore.
    */
    declare function Injectable(constructor: Function): void;

    /**
     * Marks annotated class as a DatabaseView. Renders the data source as a Relational Table.
    */
    declare function Table(columns: string[]): (constructor: Function)=> void;

    /**
     * Marks annotated class as a DatabaseView. Renders the data source as a JSON collection.
    */
    declare function Collection(constructor: Function): void;

    /**
     * Marks annotated class as a DatabaseView. Renders the data source as a Key-Value Pair.
    */
    declare function KeyValue(constructor: Function): void;

    
    /**
     * Marks members of class which need to be displayed on playground.
     * 
     * @Note Has no effect on methods
    */
    declare function Show(target: Object, propertyKey: string | symbol): void;
}
`;
