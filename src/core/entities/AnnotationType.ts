export interface AnnotationTypeProps {
    id: string;
    creatorId: string;
    name: string;
    description: string | null;
    scoreEnabled: boolean;
    classificationEnabled: boolean;
    scorename: string | null;
    scoremin: number | null;
    scoremax: number | null;
    classList: string[] | null;
    createdAt: Date;
    updatedAt: Date;
}

export class AnnotationType {
    private constructor(private props: AnnotationTypeProps) {}

    static create(data: any): AnnotationType {
        const props: AnnotationTypeProps = {
            id: data.id,
            creatorId: data.creatorId,
            name: data.name,
            description: data.description ?? null,
            scoreEnabled: data.scoreEnabled,
            classificationEnabled: data.classificationEnabled,
            scorename: data.scorename ?? null,
            scoremin: data.scoremin ?? null,
            scoremax: data.scoremax ?? null,
            classList: data.classList ?? null,
            createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
            updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
        };

        if (props.scoreEnabled && (props.scorename === null || props.scoremin === null || props.scoremax === null)) {
            throw new Error('Invalid AnnotationType: Score is enabled but score details are missing.');
        }
        
        if (props.classificationEnabled && (props.classList === null || props.classList.length === 0)) {
            throw new Error('Invalid AnnotationType: Classification is enabled but class list is missing.');
        }

        if (props.scoreEnabled && props.classificationEnabled) {
            throw new Error('Invalid AnnotationType: Both score and classification cannot be enabled simultaneously.');
        }

        return new AnnotationType(props);
    }

    get id(): string {
        return this.props.id;
    }

    get name(): string {
        return this.props.name;
    }

    get scoreEnabled(): boolean {
        return this.props.scoreEnabled;
    }

    get classificationEnabled(): boolean {
        return this.props.classificationEnabled;
    }
    

    get classList(): string[] | null {
        return this.props.classList ? [...this.props.classList] : null;
    }
    
    // Business logic
    supportsScoring(): boolean {
        return this.scoreEnabled;
    }
    
    supportsClassification(): boolean {
        return this.classificationEnabled;
    }
    
    scoreRange(): { min: number; max: number } | null {
        return this.scoreEnabled && this.props.scoremin !== null && this.props.scoremax !== null
            ? { min: this.props.scoremin, max: this.props.scoremax }
            : null;
    }

    classListForSerialization(): string[] | null {
        return this.classificationEnabled && this.props.classList ? [...this.props.classList] : null;
    }
     

    toJSON() {
        return { ...this.props };
    }

}

        