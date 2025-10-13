pipeline {
    agent any

    environment {
        IMAGE_NAME = "your-dockerhub-username/andhrawala-project"
        IMAGE_TAG  = "latest"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Archive HTML') {
            steps {
                archiveArtifacts artifacts: '**/*.html', fingerprint: true
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    // Check if credentials exist
                    def credsExist = false
                    try {
                        withCredentials([usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            credsExist = true
                        }
                    } catch (e) {
                        echo "⚠️ Docker Hub credentials not found! Skipping Docker push."
                        credsExist = false
                    }

                    if (credsExist) {
                        withCredentials([usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            sh """
                                echo "Logging into Docker Hub..."
                                docker login -u $DOCKER_USER -p $DOCKER_PASS
                                echo "Building Docker image..."
                                docker build -t $IMAGE_NAME:$IMAGE_TAG .
                                echo "Pushing Docker image..."
                                docker push $IMAGE_NAME:$IMAGE_TAG
                                docker logout
                            """
                        }
                    } else {
                        echo "Skipping Docker Build & Push because credentials are missing."
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
        success {
            echo "✅ Pipeline succeeded!"
        }
    }
}

