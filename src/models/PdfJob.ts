import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class PdfJob extends Model {
  public id!: number;
  public hash!: string;
  public status!: 'open' | 'in_progress' | 'success' | 'error';
  public status_message?: string;
  public pdf?: Buffer;
  public assets?: string;
  public created_at!: Date;
  public updated_at!: Date;

  static async findByHash(hash: string): Promise<PdfJob | null> {
    return this.findOne({ where: { hash } });
  }

  static async updateStatus(hash: string, status: string, message?: string): Promise<void> {
    await this.update(
      { status, status_message: message },
      { where: { hash } }
    );
  }

  static async updateWithPDF(hash: string, pdfBuffer: Buffer): Promise<void> {
    await this.update(
      { 
        pdf: pdfBuffer, 
        status: 'success',
        assets: null // Clear assets after successful completion
      },
      { where: { hash } }
    );
  }

  static async deleteByHash(hash: string): Promise<void> {
    await this.destroy({ where: { hash } });
  }
}

PdfJob.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    hash: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'success', 'error'),
      defaultValue: 'open'
    },
    status_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pdf: {
      type: DataTypes.BLOB,
      allowNull: true
    },
    assets: {
      type: DataTypes.BLOB,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'pdfs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);