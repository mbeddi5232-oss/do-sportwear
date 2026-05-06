pipeline {
  agent any

  stages {
    stage('Checkout') { 
      steps {
        checkout scm
        echo 'Code fetched from GitHub'
      }
    }

    stage('Verify Environment') {
      steps {
        script {
          if (isUnix()) {
            sh 'node --version'
            sh 'npm --version'
          } else {
            bat 'node --version'
            bat 'npm --version'
          }
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm ci'
          } else {
            bat 'npm install --legacy-peer-deps'
          }
        }
      }
    }

    stage('Quality Gate: Linting') {
            steps {
                script {
                    echo 'Starting Static Code Analysis...'
                    if (isUnix()) {
                      sh 'npx eslint .'
                    } else {
                      bat 'npx eslint .'
                    }
                }
            }
        }
    


    stage('Security Gate: Audit') {
      steps {
        script {
          echo ' Scanning for known vulnerabilities in packages...'
          if (isUnix()) {
            // --audit-level=high means it only fails if it finds a dangerous bug
            sh 'npm audit --audit-level=high'
          } else {
            bat 'npm audit --audit-level=high'
          }
          echo ' No critical security issues found.'
        }
      }
    }
    stage('Build (optional)') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm run build --if-present'
          } else {
            bat 'npm run build --if-present'
          }
        }
      }
    }

    stage('Unit Tests') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm test'
          } else {
            bat 'npm test'
          }
        }
      }
    }
    stage('Docker Build') {
      steps {
        script {
          if (isUnix()) {
            echo "Building the image locally..."
            sh "docker build -t sportwear-backend:latest ."
          } else {
            echo "Building the image locally..."
            bat "docker build -t sportwear-backend:latest ."
        }
      }
    }
  }
}
}
