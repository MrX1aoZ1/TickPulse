package services

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/models"
)

type UserService struct {
	DB *sqlx.DB
}

func (s *UserService) GetUserByEmail(email string) (*models.UserCredentials, error) {
	var row models.UserCredentials
	err := s.DB.Get(&row, `
		SELECT u.id, u.email, u.username, ua.credential AS password_hash
		FROM Users u
		JOIN UserAuth ua ON u.id = ua.user_id
		WHERE u.email = ? AND ua.provider = 'local'`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *UserService) GetUserByID(id int) (*models.User, error) {
	var user models.User
	err := s.DB.Get(&user, `SELECT id, email, username, license_key, created_at FROM Users WHERE id = ?`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetUserByProvider(provider, providerID string) (*models.User, error) {
	var auth models.UserAuth
	err := s.DB.Get(&auth, `
		SELECT id, user_id, provider, provider_id, credential
		FROM UserAuth
		WHERE provider = ? AND provider_id = ?`, provider, providerID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return s.GetUserByID(auth.UserID)
}

func (s *UserService) IsProviderLinked(provider, providerID string) (bool, error) {
	var n int
	err := s.DB.Get(&n, `SELECT COUNT(*) FROM UserAuth WHERE provider = ? AND provider_id = ?`, provider, providerID)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (s *UserService) LinkProviderToUser(userID int, provider, providerID string) error {
	_, err := s.DB.Exec(
		`INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, ?, ?, NULL)`,
		userID, provider, providerID,
	)
	return err
}

func (s *UserService) SetLicenseKey(userID int, key string) error {
	_, err := s.DB.Exec(`UPDATE Users SET license_key = ? WHERE id = ?`, key, userID)
	return err
}

func (s *UserService) CreateUserAccount(email, username, provider, providerID string, password *string, licenseKey *string) (*models.User, error) {
	tx, err := s.DB.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`INSERT INTO Users (email, username, license_key) VALUES (?, ?, ?)`, email, username, licenseKey)
	if err != nil {
		return nil, err
	}
	insertedID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		`INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, ?, ?, ?)`,
		insertedID, provider, providerID, password,
	)
	if err != nil {
		return nil, err
	}

	inboxID := fmt.Sprintf("inbox_%d", insertedID)
	inbox := models.Category{
		ID:           inboxID,
		UserID:       int(insertedID),
		CategoryName: "Inbox",
		SortOrder:    models.InitialCategoryRank,
	}
	_, err = tx.Exec(
		`INSERT INTO Categories (id, user_id, category_name, sort_order) VALUES (?, ?, ?, ?)`,
		inbox.ID, inbox.UserID, inbox.CategoryName, inbox.SortOrder,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	user, err := s.GetUserByID(int(insertedID))
	if err != nil {
		return &models.User{ID: int(insertedID), Email: email}, err
	}
	if user == nil {
		return &models.User{ID: int(insertedID), Email: email}, nil
	}
	return user, nil
}
