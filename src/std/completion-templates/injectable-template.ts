export default `/**
 * Auto generated code for a service.
 * 
 * You can update this comment block and it will reflect
 * it as description on the playground!
*/  
@Injectable
class NewService {

    @Show
    private healthy = false;

    /**
     * Checks if all systems are good.
    */
    healthCheck() {
        if(this.isDbReachable()) {
            this.healthy = true;
            return 200; 
        }

        this.healthy = false;
        return 500
    }

    /**
     * Checks if DB connection is good.
    */
    isDbReachable() {
        const isFailure = this.failRandomly(10);
        std.log('DB failure', isFailure);
        return !isFailure;
    }

    /**
     * This won't show up in playground since it's private.
     * 
     * It takes a failure probability in percentage and returns
     * a boolean indicating if it indeed failed or not.
    */
    private failRandomly(failProbablityPercentage: number): boolean {
        const parsedProbability = failProbablityPercentage/100;
        const rand = Math.random();

        if(rand <= parsedProbability) {
            return true;
        }

        return false;
    }

}`;
