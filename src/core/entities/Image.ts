import { ImageStatus }  from "../value-objects/ImageStatus";

export interface ImageProps {
 id : string;
 patientId : string;
 creatorId : string;
 name : string;
 format : string;
 width : number | null;
 height : number | null;
 status : ImageStatus;
 originpath : string | null;
 processedpath : string | null;
 createdAt : Date;
 updatedAt : Date;
}

export class Image {
 private constructor (private props : ImageProps) {}

 static create (data : any) : Image {
   return new Image ({
     id : data.id,
     patientId : data.patientId,
     creatorId : data.creatorId,
     name : data.name,
     format : data.format,
     width : data.width ?? null,
     height : data.height ?? null,
     status : ImageStatus.fromString(data.status),
     originpath : data.originpath ?? null,
     processedpath : data.processedpath ?? null,
     createdAt : typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
     updatedAt : typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
   });
 }

    get id () : string { 
        return this.props.id;
    }

    get patientId () : string {
        return this.props.patientId;
    }

    get creatorId () : string {
        return this.props.creatorId;
    }

    get name () : string {
        return this.props.name;
    }

    get format () : string {
        return this.props.format;
    }

    get width () : number | null {
        return this.props.width;
    }

    get height () : number | null {
        return this.props.height;
    }

    get status () : ImageStatus {
        return this.props.status;
    }

    get originpath () : string | null {
        return this.props.originpath;
    }

    get processedpath () : string | null {
        return this.props.processedpath;
    }

    // Business logic
    isProcessed () : boolean {
        return this.status.isProcessed();
    }
    
    toJSON () {
        return { ...this.props };
    }
}