#!/bin/bash

# Field Tracker Backup Script
# Creates backups of database and uploaded files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="field_tracker_db_${DATE}.sql"
FILES_BACKUP_FILE="field_tracker_files_${DATE}.tar.gz"

echo -e "${GREEN}💾 Field Tracker Backup Script${NC}"

# Function to create backup directory
create_backup_dir() {
    echo -e "${YELLOW}📁 Creating backup directory...${NC}"
    mkdir -p ${BACKUP_DIR}
}

# Function to backup database
backup_database() {
    echo -e "${YELLOW}🗄️  Backing up database...${NC}"
    
    # Check if postgres container is running
    if ! docker-compose ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ PostgreSQL container is not running${NC}"
        exit 1
    fi
    
    # Create database backup
    docker-compose exec -T postgres pg_dump -U field_tracker -d field_tracker > "${BACKUP_DIR}/${DB_BACKUP_FILE}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database backup completed: ${DB_BACKUP_FILE}${NC}"
    else
        echo -e "${RED}❌ Database backup failed${NC}"
        exit 1
    fi
}

# Function to backup uploaded files
backup_files() {
    echo -e "${YELLOW}📁 Backing up uploaded files...${NC}"
    
    # Check if uploads volume exists
    if docker volume ls | grep -q "field-tracker_uploads_data"; then
        # Create temporary container to access volume
        docker run --rm -v field-tracker_uploads_data:/uploads -v $(pwd)/${BACKUP_DIR}:/backup alpine tar czf /backup/${FILES_BACKUP_FILE} -C /uploads .
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Files backup completed: ${FILES_BACKUP_FILE}${NC}"
        else
            echo -e "${RED}❌ Files backup failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  No uploads volume found, skipping files backup${NC}"
    fi
}

# Function to backup configuration
backup_config() {
    echo -e "${YELLOW}⚙️  Backing up configuration...${NC}"
    
    CONFIG_BACKUP_FILE="field_tracker_config_${DATE}.tar.gz"
    
    # Backup important configuration files (excluding secrets)
    tar czf "${BACKUP_DIR}/${CONFIG_BACKUP_FILE}" \
        --exclude='.env' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        --exclude='backups' \
        docker-compose.yml \
        nginx/ \
        scripts/ \
        licenses/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ Configuration backup completed: ${CONFIG_BACKUP_FILE}${NC}"
}

# Function to show backup summary
show_summary() {
    echo -e "${GREEN}"
    echo "🎉 Backup completed successfully!"
    echo ""
    echo "📦 Backup files created:"
    echo "   • Database: ${BACKUP_DIR}/${DB_BACKUP_FILE}"
    
    if [ -f "${BACKUP_DIR}/${FILES_BACKUP_FILE}" ]; then
        echo "   • Files: ${BACKUP_DIR}/${FILES_BACKUP_FILE}"
    fi
    
    echo "   • Config: ${BACKUP_DIR}/field_tracker_config_${DATE}.tar.gz"
    echo ""
    echo "💡 Backup size:"
    du -sh ${BACKUP_DIR}/*${DATE}* 2>/dev/null || echo "   Unable to calculate size"
    echo ""
    echo "⚠️  Important Notes:"
    echo "   • Store backups in a secure location"
    echo "   • Test restore procedures regularly"
    echo "   • Keep multiple backup copies"
    echo "   • .env file is excluded for security (backup manually if needed)"
    echo ""
    echo -e "${NC}"
}

# Function to clean old backups (optional)
cleanup_old_backups() {
    RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
    
    if [ "$BACKUP_CLEANUP" = "true" ]; then
        echo -e "${YELLOW}🧹 Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"
        find ${BACKUP_DIR} -name "field_tracker_*" -type f -mtime +${RETENTION_DAYS} -delete
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    fi
}

# Main backup flow
main() {
    create_backup_dir
    backup_database
    backup_files
    backup_config
    cleanup_old_backups
    show_summary
}

# Handle script arguments
case "$1" in
    "db-only")
        echo -e "${YELLOW}📊 Database-only backup mode${NC}"
        create_backup_dir
        backup_database
        ;;
    "files-only")
        echo -e "${YELLOW}📁 Files-only backup mode${NC}"
        create_backup_dir
        backup_files
        ;;
    "config-only")
        echo -e "${YELLOW}⚙️  Config-only backup mode${NC}"
        create_backup_dir
        backup_config
        ;;
    *)
        main
        ;;
esac

echo -e "${GREEN}✅ Backup script completed!${NC}"