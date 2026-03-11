import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import * as argon2 from 'argon2';

@Entity()
export class User {
    @PrimaryColumn({ default: 'ADMIN' })
    id: string = 'ADMIN';

    @Column()
    username: string;

    @Column({ select: false })
    password: string;
    
    @Column({ select: false, nullable: true })
    mfaSecret: string | null;

    @Column({ default: false })
    isMfaEnabled: boolean;

    @Column({ type: 'simple-array', nullable: true, select: false })
    mfaRecoveryCodes: string[] | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ type: 'bigint', default: 0 })
    token_version: number = 0;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$argon2')) {
            this.password = await argon2.hash(
                this.password,
                {
                    type: argon2.argon2id,
                    memoryCost: 2 ** 16,
                    timeCost: 3,
                    parallelism: 1
                });
        }
    }
}
