export default `type NewEntity = {
    id: string,
    value: string,
    createdAt: number,
}

/**
 * Auto generated code for a NoSQL collection.
 * 
 * You can update this comment block and it will reflect
 * it as description on the playground!
*/  
@Injectable
@Collection
class NewCollection {

    @Show
    data: NewEntity[] = [];

    insert(recordToInsert: Omit<NewEntity, 'createdAt'>) {
        const record: NewEntity = {
            ...recordToInsert,
            createdAt: std.currentTick(),
        };

        this.data.push(record);
        return record;
    }

    find(predicate: (record: NewEntity) => boolean) {
        return this.data.find(predicate);
    }

    findAll(predicate: (record: NewEntity) => boolean) {
        return this.data.filter(predicate);
    }

    update(
        partialUpdate: Partial<NewEntity>,
        predicate: (record: NewEntity) => boolean,
    ) {
        const indexOfRecord = this.data.findIndex(predicate);
        if(indexOfRecord < 0) {
            return;
        }
        const existingRecord = this.data[indexOfRecord];
        const updatedRecord = {
            ...existingRecord,
            ...partialUpdate,
        };
    
        this.data[indexOfRecord] = updatedRecord;

        return updatedRecord;
    }

    delete(predicate: (record: NewEntity) => boolean) {
        const index = this.data.findIndex(predicate);
        if(index < 0) {
            return;
        }
        this.data.splice(index, 1);
    }

}`;
